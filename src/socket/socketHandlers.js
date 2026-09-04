// =========================================================
// socketHandlers.js — Realtime Socket.IO Handlers
// Supports 200-Player D&D Campaign, Master Screen, and D20 Rolls
// =========================================================

const { generateIndividualDndLore, isAIEnabled } = require('../../aiEngine');
const { ROUNDS_DATA } = require('../constants/gameData');
const {
  rooms,
  generateRoomCode,
  createDistrictRoom,
  quickJoinMaster,
  fillDistrictBots,
  finalizeDistrictsAndBots,
  getNationalAggregates
} = require('../services/roomManager');
const {
  resolvePlayerDndRoll,
  processDistrictSettlement,
  autoRollDistrictBots,
  autoTakeoverInactivePlayers
} = require('../engine/settlementEngine');
const { calculateLorenzAndGini, evaluateFinalResults } = require('../engine/economicsEngine');
const { createRateLimiter } = require('../utils/security');

function registerSocketHandlers(io, rooms, options = {}) {
  const { getLocalIpAddress, QRCode, DEFAULT_PORT, verifyAdminPin } = options;

  // Broadcast national update to all Master Screens
  function broadcastNationalUpdate(liveEvent = null) {
    const aggregates = getNationalAggregates();
    io.to('master_screen_channel').emit('master:national_update', {
      aggregates,
      liveEvent
    });
  }

  io.on('connection', (socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // Security: In-memory Rate Limiter per Socket (Max 30 events per 5 seconds)
    const socketLimiter = createRateLimiter(5000, 30);
    socket.use(([event, ...args], next) => {
      const check = socketLimiter(socket.id);
      if (!check.allowed) {
        socket.emit('rate_limit_error', 'คุณส่งคำขอเร็วเกินไป กรุณารอสักครู่');
        return next(new Error('Rate limit exceeded'));
      }
      next();
    });

    // Helper: Verify Master Screen Admin Authorization
    function checkAdminAuth() {
      if (!socket.isAdminAuthenticated) {
        socket.emit('master:auth_required', { error: 'กรุณายืนยันรหัส Admin PIN ก่อนสั่งการระบบ' });
        return false;
      }
      return true;
    }

    // ---------------------------------------------------------
    // MASTER SCREEN (National Command Center)
    // ---------------------------------------------------------
    socket.on('master:auth', ({ pin }) => {
      if (verifyAdminPin && verifyAdminPin(pin)) {
        socket.isAdminAuthenticated = true;
        socket.emit('master:auth_success', { message: 'ยืนยันสิทธิ์ผู้ดูแลระบบสำเร็จ' });
        console.log(`[Master Auth Success] Socket ${socket.id} authorized as Admin.`);
      } else {
        socket.emit('master:auth_failed', { error: 'รหัส Admin PIN ไม่ถูกต้อง' });
        console.warn(`[Master Auth Failed] Socket ${socket.id} failed Admin PIN check.`);
      }
    });
    socket.on('master:join', async () => {
      socket.join('master_screen_channel');
      const aggregates = getNationalAggregates();
      
      // Auto-detect public host / domain when deployed behind proxies (Cloud/VPS)
      const host = socket.handshake.headers['x-forwarded-host'] || socket.handshake.headers.host;
      const proto = socket.handshake.headers['x-forwarded-proto'] || (socket.handshake.secure ? 'https' : 'http');
      const isLocalhost = !host || host.startsWith('localhost') || host.startsWith('127.0.0.1');

      let joinUrl;
      if (process.env.PUBLIC_URL) {
        joinUrl = `${process.env.PUBLIC_URL.replace(/\/$/, '')}/?view=player`;
      } else if (!isLocalhost) {
        joinUrl = `${proto}://${host}/?view=player`;
      } else {
        const localIp = getLocalIpAddress ? getLocalIpAddress() : 'localhost';
        const port = DEFAULT_PORT || 3005;
        joinUrl = `http://${localIp}:${port}/?view=player`;
      }

      let qrDataUrl = null;
      if (QRCode) {
        try {
          qrDataUrl = await QRCode.toDataURL(joinUrl, {
            margin: 1,
            width: 320,
            color: { dark: '#0b0f17', light: '#ffffff' }
          });
        } catch (e) {
          console.error('QR generation error:', e);
        }
      }

      socket.emit('master:national_update', {
        aggregates,
        qrDataUrl,
        joinUrl,
        localIp: isLocalhost ? (getLocalIpAddress ? getLocalIpAddress() : 'localhost') : (host || 'server')
      });
      console.log(`[Master Screen Joined] Socket ID: ${socket.id} (QR URL: ${joinUrl})`);
    });

    socket.on('master:request_qr', async ({ customUrl }) => {
      if (!checkAdminAuth()) return;

      if (QRCode && customUrl) {
        try {
          const qrDataUrl = await QRCode.toDataURL(customUrl, {
            margin: 1,
            width: 320,
            color: { dark: '#0b0f17', light: '#ffffff' }
          });
          socket.emit('master:qr_updated', { qrDataUrl, joinUrl: customUrl });
        } catch (e) {
          console.error('QR custom update error:', e);
        }
      }
    });

    socket.on('master:request_district_details', ({ districtCode }) => {
      const room = rooms.get(districtCode);
      if (!room) {
        socket.emit('master:district_details_error', 'District not found');
        return;
      }
      const eco = calculateLorenzAndGini(room.players);
      socket.emit('master:district_details', {
        room,
        eco,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1]
      });
    });

    // Master Control 1: Start Game & Finalize Bots for all Districts
    socket.on('master:start_game', () => {
      if (!checkAdminAuth()) return;

      const activeCount = finalizeDistrictsAndBots();

      for (const [code, room] of rooms.entries()) {
        if (room.status === 'playing') {
          room.round = 1;
          room.phase = 'action';
          room.currentRoundData = ROUNDS_DATA[0];
          room.players.forEach(p => { p.hasRolledThisRound = false; });
          io.to(code).emit('room:updated', { room, roundInfo: ROUNDS_DATA[0] });
        }
      }

      broadcastNationalUpdate({
        type: 'start',
        message: `🚀 มหาแคมเปญเศรษฐกิจเปิดฉากแล้ว! มีเขตเศรษฐกิจเข้าร่วมทั้งสิ้น ${activeCount} เขต (เติมบอท 🤖 ครบสมบูรณ์)`
      });
      console.log(`[Master Screen] Started game for ${activeCount} active districts.`);
    });

    // Master Control 2: Global Settle All Districts with 1 click
    socket.on('master:global_settle', () => {
      if (!checkAdminAuth()) return;

      let settledCount = 0;
      let currentRound = 1;

      for (const [code, room] of rooms.entries()) {
        if (room.status === 'playing' && room.players.length > 0) {
          currentRound = room.round;
          // Auto-takeover for any human player who timed out or disconnected
          autoTakeoverInactivePlayers(room);
          // Pure Random actions & D20 rolls for bots
          autoRollDistrictBots(room);
          // Process settlement
          const settlement = processDistrictSettlement(room);
          settledCount++;

          io.to(code).emit('room:updated', {
            room,
            settlement,
            roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1]
          });
        }
      }

      broadcastNationalUpdate({
        type: 'settle',
        message: `⚙️ ประมวลผลเศรษฐกิจไตรมาสที่ ${currentRound} ครบทุกเขต (${settledCount} เขต) เรียบร้อยแล้ว!`
      });
      console.log(`[Master Screen] Global Settle completed for ${settledCount} districts.`);
    });

    // Master Control 3: Advance All Districts to Next Quarter with 1 click
    socket.on('master:advance_all', () => {
      if (!checkAdminAuth()) return;

      let nextRound = 1;
      let isFinalGameOver = false;

      for (const [code, room] of rooms.entries()) {
        if (room.status === 'playing' && room.players.length > 0) {
          if (room.round < room.maxRounds) {
            room.round += 1;
            nextRound = room.round;
            room.currentRoundData = ROUNDS_DATA[room.round - 1];
            room.phase = 'action';
            // Security: Reset round roll eligibility for all players
            room.players.forEach(p => { p.hasRolledThisRound = false; });
            io.to(code).emit('room:updated', {
              room,
              roundInfo: room.currentRoundData
            });
          } else {
            isFinalGameOver = true;
            room.status = 'gameover';
            room.phase = 'dashboard';
            const finalEval = evaluateFinalResults(room);
            io.to(code).emit('game_over', { room, finalEval });
          }
        }
      }

      if (isFinalGameOver) {
        broadcastNationalUpdate({
          type: 'gameover',
          message: `🏆 สิ้นสุดมหาแคมเปญ 6 ไตรมาส! เข้าสู่การประเมิน 3 มหาปรัชญาเศรษฐกิจและประกาศผู้ชนะทุกเขต!`
        });
      } else {
        broadcastNationalUpdate({
          type: 'advance',
          message: `🚩 ทุกเขตเศรษฐกิจก้าวเข้าสู่ ${ROUNDS_DATA[nextRound - 1].chapterName}`
        });
      }
      console.log(`[Master Screen] Global advance executed (isFinalGameOver: ${isFinalGameOver}).`);
    });

    // ---------------------------------------------------------
    // QUICK JOIN MASTER (Single QR Code for 200 Players)
    // ---------------------------------------------------------
    socket.on('player:quick_join_master', ({ playerName }) => {
      const { room, player } = quickJoinMaster(playerName, socket.id);
      socket.roomCode = room.code;
      socket.playerId = player.id;
      socket.join(room.code);

      console.log(`[Quick Join] Player ${player.name} (${player.className}) assigned to ${room.districtName} (${room.code})`);

      socket.emit('player:init', {
        room,
        myPlayer: player,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1]
      });

      io.to(room.code).emit('room:updated', { room });

      // Notify Master Screen of new adventurer
      broadcastNationalUpdate({
        type: 'join',
        message: `👤 ${player.name} ได้ถือกำเนิดเป็น "${player.className}" ใน ${room.districtName}!`
      });
    });

    // ---------------------------------------------------------
    // D20 ROLL & ACTION RESOLUTION
    // ---------------------------------------------------------
    socket.on('player:roll_d20', async ({ actionId }) => {
      const roomCode = socket.roomCode;
      const playerId = socket.playerId;
      if (!roomCode || !playerId) {
        socket.emit('roll_error', 'ไม่พบข้อมูลผู้เล่นหรือห้อง');
        return;
      }

      const room = rooms.get(roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (!player) return;

      // Security: Anti-Cheat — prevent duplicate rolls in the same round
      if (player.hasRolledThisRound) {
        socket.emit('roll_error', 'คุณได้ทอยเต๋าในไตรมาสนี้ไปแล้ว กรุณารอเข้าสู่ไตรมาสถัดไป');
        return;
      }

      // 1. Resolve D20 and economic math immediately (Server is dice authority)
      const rollResult = resolvePlayerDndRoll(room, player, actionId);

      // Emit instant resolution to player
      socket.emit('player:roll_resolved', {
        rollResult,
        myPlayer: player,
        roomMacro: room.macroStats
      });

      // Emit update to the district party
      io.to(roomCode).emit('room:updated', { room });

      // Prepare Live Ticker notification for Master Screen
      let tickerMsg = `${player.name} (${room.districtName}): ${rollResult.outcomeTitle}`;
      if (rollResult.isNat20) {
        tickerMsg = `🎉 [NAT 20!] ${player.name} (${room.districtName}) ร่าย ${rollResult.actionName} ปังสุดๆ!`;
      } else if (rollResult.isNat1) {
        tickerMsg = `💀 [NAT 1!] ${player.name} (${room.districtName}) เกิดอุบัติเหตุทางเศรษฐกิจใน ${rollResult.actionName}!`;
      } else if (room.macroStats.crisisAlert) {
        tickerMsg = `🚨 ${room.districtName} เข้าสู่ภาวะวิกฤต! ${room.macroStats.crisisAlert}`;
      }

      broadcastNationalUpdate({
        type: rollResult.isNat20 ? 'nat20' : (rollResult.isNat1 ? 'nat1' : 'roll'),
        message: tickerMsg,
        rollResult
      });

      // 2. Asynchronously generate personalized AI GM lore
      try {
        const aiLore = await generateIndividualDndLore(player, rollResult, {
          name: room.districtName,
          round: room.round,
          gini: room.macroStats.gini,
          debtToGdp: room.macroStats.debtToGdp
        });
        player.lastAiLore = aiLore;
        socket.emit('player:ai_lore', { aiLore });
      } catch (err) {
        console.error('AI Lore error:', err);
      }
    });

    // ---------------------------------------------------------
    // DISTRICT CONTROLS (Advance Chapter & Fill Bots)
    // ---------------------------------------------------------
    socket.on('district:advance_round', () => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      // Auto roll for AI bots before advancing
      autoRollDistrictBots(room);

      // Settle economics for this chapter
      const settlement = processDistrictSettlement(room);

      if (room.round < room.maxRounds) {
        room.round += 1;
        room.currentRoundData = ROUNDS_DATA[room.round - 1];
        room.phase = 'action';
        // Security: Reset round roll eligibility for all players in district
        room.players.forEach(p => { p.hasRolledThisRound = false; });
      } else {
        room.status = 'gameover';
        room.phase = 'dashboard';
        const finalEval = evaluateFinalResults(room);
        io.to(roomCode).emit('game_over', { room, finalEval });
      }

      io.to(roomCode).emit('room:updated', {
        room,
        settlement,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1]
      });

      broadcastNationalUpdate({
        type: 'advance',
        message: `🚩 ${room.districtName} เดินทางเข้าสู่ ${ROUNDS_DATA[room.round - 1].chapterName}`
      });
    });

    socket.on('district:fill_bots', () => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      fillDistrictBots(room);
      io.to(roomCode).emit('room:updated', { room });
      socket.emit('bots_filled', { count: room.players.length });

      broadcastNationalUpdate({
        type: 'bots',
        message: `🤖 ${room.districtName} เติมบอทนักผจญภัยครบ 10 คนแล้ว พร้อมเริ่มปฏิบัติการ!`
      });
    });

    // ---------------------------------------------------------
    // LEGACY ROOM COMPATIBILITY (create_room, join_room, etc.)
    // ---------------------------------------------------------
    socket.on('create_room', () => {
      const roomCode = generateRoomCode();
      const room = createDistrictRoom(roomCode, 99, socket.id);
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.emit('room_created', { roomCode, room });
    });

    socket.on('join_room', ({ roomCode, playerName, isProjector }) => {
      const cleanCode = (roomCode || '').toUpperCase().trim();
      let room = rooms.get(cleanCode);

      if (!room) {
        socket.emit('join_error', 'ไม่พบห้องรหัสนี้ กรุณาตรวจสอบรหัสห้องอีกครั้ง');
        return;
      }

      socket.join(cleanCode);
      socket.roomCode = cleanCode;

      if (isProjector) {
        room.hostSocketId = socket.id;
        socket.emit('joined_as_projector', { roomCode: cleanCode, room });
        return;
      }

      // Check existing player or assign role
      let player = room.players.find(p => p.socketId === socket.id);
      if (!player) {
        const { player: newPlayer } = quickJoinMaster(playerName, socket.id);
        player = newPlayer;
      }

      socket.playerId = player.id;
      socket.emit('player:init', {
        room,
        myPlayer: player,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1]
      });

      io.to(cleanCode).emit('room:updated', { room });
    });

    // Disconnect & Mark Player for Auto-Bot Takeover
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
      for (const [code, room] of rooms.entries()) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.isDisconnected = true;
          io.to(code).emit('room:player_disconnected', {
            playerId: player.id,
            name: player.name,
            message: `⚠️ ${player.name} ขาดการเชื่อมต่อ (ระบบจะใช้บอท 🤖 ช่วยเล่นแทนอัตโนมัติหากหมดเวลา)`
          });
          console.log(`[Player Marked Disconnected] ${player.name} in ${room.districtName}`);
          break;
        }
      }
    });
  });

  // Heartbeat to keep Master Screen live every 4 seconds
  setInterval(() => {
    broadcastNationalUpdate();
  }, 4000);
}

module.exports = {
  registerSocketHandlers
};
