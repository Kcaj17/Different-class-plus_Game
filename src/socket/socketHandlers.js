// =========================================================
// socketHandlers.js — Realtime Socket.IO Handlers
// Supports 200-Player D&D Campaign, Master Screen, and D20 Rolls
// =========================================================

const { generateIndividualDndLore, generateRoundDynamicActions, isAIEnabled } = require('../../aiEngine');
const { ROUNDS_DATA } = require('../constants/gameData');
const {
  rooms,
  generateRoomCode,
  createDistrictRoom,
  createCustomDistrict,
  quickJoinMaster,
  joinSpecificDistrict,
  kickPlayerFromDistrict,
  resetSpecificDistrict,
  fillDistrictBots,
  startDistrictWithBots,
  finalizeDistrictsAndBots,
  getNationalAggregates,
  getRoomRoundActions
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
  const disconnectTimers = new Map();

  // Background pre-generation for next round's AI dynamic actions
  function pregenerateNextRoundActions(room) {
    if (!room || room.status !== 'playing') return;
    const nextRound = room.round + 1;
    if (nextRound > room.maxRounds) return;

    if (room.roundActions && room.roundActions[nextRound]) return;

    setTimeout(async () => {
      try {
        const nextRoundData = ROUNDS_DATA[nextRound - 1] || {};
        const dynamicActions = await generateRoundDynamicActions(
          nextRound,
          nextRoundData,
          room.macroStats || {}
        );
        if (!room.roundActions) room.roundActions = {};
        room.roundActions[nextRound] = dynamicActions;
        console.log(`[AI Pre-Gen] Ready: ${room.districtName} Round ${nextRound} actions`);
      } catch (err) {
        console.warn(`[AI Pre-Gen] Failed for Round ${nextRound}:`, err.message);
      }
    }, 100);
  }

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
          room.players.forEach(p => { p.hasRolledThisRound = false; p.lastAiLore = null; });
          const currentRoundActions = getRoomRoundActions(room, 1);
          io.to(code).emit('room:started', { room, roundInfo: ROUNDS_DATA[0], roundActions: currentRoundActions });
          io.to(code).emit('room:updated', { room, roundInfo: ROUNDS_DATA[0], roundActions: currentRoundActions });
          pregenerateNextRoundActions(room);
        }
      }

      broadcastNationalUpdate({
        type: 'start',
        message: `🚀 เริ่มเกมเรียบร้อยแล้ว! มีกลุ่มเศรษฐกิจเข้าร่วมทั้งสิ้น ${activeCount} กลุ่ม (เติมบอท 🤖 ครบแล้ว)`
      });
      console.log(`[Master Screen] Started game for ${activeCount} active districts.`);
    });

    // Master Control 2: Global Settle All Districts with 1 click
    socket.on('master:global_settle', () => {
      if (!checkAdminAuth()) return;

      const now = Date.now();
      if (socket._lastMasterSettleTime && (now - socket._lastMasterSettleTime < 1500)) {
        console.warn('[Master Screen] Ignored rapid duplicate master:global_settle');
        return;
      }
      socket._lastMasterSettleTime = now;

      let settledCount = 0;
      let currentRound = 1;

      for (const [code, room] of rooms.entries()) {
        if (room.status === 'playing' && room.players.length > 0) {
          currentRound = room.round;
          // Auto-takeover for any human player who timed out or disconnected
          autoTakeoverInactivePlayers(room, true);
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
        message: `⚙️ ประมวลผลเศรษฐกิจรอบที่ ${currentRound} ครบทุกกลุ่ม (${settledCount} กลุ่ม) เรียบร้อยแล้ว!`
      });
      console.log(`[Master Screen] Global Settle completed for ${settledCount} districts.`);
    });

    // Master Control 3: Advance All Districts to Next Quarter with 1 click
    socket.on('master:advance_all', () => {
      if (!checkAdminAuth()) return;

      const now = Date.now();
      if (socket._lastMasterAdvanceTime && (now - socket._lastMasterAdvanceTime < 1500)) {
        console.warn('[Master Screen] Ignored rapid duplicate master:advance_all');
        return;
      }
      socket._lastMasterAdvanceTime = now;

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
            room.players.forEach(p => { p.hasRolledThisRound = false; p.lastAiLore = null; });
            const currentRoundActions = getRoomRoundActions(room, room.round);
            io.to(code).emit('room:updated', {
              room,
              roundInfo: room.currentRoundData,
              roundActions: currentRoundActions
            });
            pregenerateNextRoundActions(room);
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
          message: `🏆 สิ้นสุดการเล่นครบ 6 รอบ! สรุปผลการประเมินทางเศรษฐกิจและผู้ชนะในแต่ละกลุ่ม`
        });
      } else {
        broadcastNationalUpdate({
          type: 'advance',
          message: `🚩 ทุกกลุ่มเริ่มต้น ${ROUNDS_DATA[nextRound - 1].chapterName}`
        });
      }
      console.log(`[Master Screen] Global advance executed (isFinalGameOver: ${isFinalGameOver}).`);
    });

    // Master Control 4: Kick Player from District
    socket.on('master:kick_player', ({ roomCode, playerId }) => {
      if (!checkAdminAuth()) {
        socket.emit('admin_auth_failed', { message: 'กรุณากรอกรหัส Admin PIN ก่อนดำเนินการ' });
        return;
      }

      const result = kickPlayerFromDistrict(roomCode, playerId);
      if (result.error) {
        socket.emit('master:action_error', { message: result.error });
        return;
      }

      const { room, kickedPlayer } = result;

      // Find socket of kicked player and notify them
      if (kickedPlayer.socketId) {
        io.to(kickedPlayer.socketId).emit('player:kicked', {
          message: `คุณถูกผู้ดูแลระบบนำออกจากกลุ่ม ${room.districtName} (${room.code})`
        });
      }

      // Notify the room
      const currentRoundActions = getRoomRoundActions(room, room.round);
      io.to(room.code).emit('room:updated', {
        room,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1],
        roundActions: currentRoundActions
      });

      // Update Inspector Modal on Admin Screen if open
      const eco = calculateLorenzAndGini(room.players);
      socket.emit('master:district_details', {
        room,
        eco,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1]
      });

      broadcastNationalUpdate({
        type: 'kick',
        message: `🚫 ผู้ดูแลระบบนำ ${kickedPlayer.name} ออกจาก ${room.districtName}`
      });

      console.log(`[Admin] Kicked player ${kickedPlayer.name} (${kickedPlayer.id}) from ${room.code}`);
    });

    // Master Control 5: Reset Specific District
    socket.on('master:reset_district', ({ roomCode }) => {
      if (!checkAdminAuth()) {
        socket.emit('admin_auth_failed', { message: 'กรุณากรอกรหัส Admin PIN ก่อนดำเนินการ' });
        return;
      }

      const result = resetSpecificDistrict(roomCode);
      if (result.error) {
        socket.emit('master:action_error', { message: result.error });
        return;
      }

      const { room, prevPlayers } = result;

      // Notify all previous human players that the room was reset and return them to lobby
      prevPlayers.forEach(p => {
        if (!p.isBot && p.socketId) {
          io.to(p.socketId).emit('player:kicked', {
            message: `กลุ่ม ${room.districtName} (${room.code}) ถูกผู้ดูแลระบบรีเซ็ตแล้ว`
          });
        }
      });

      // Notify the room
      const currentRoundActions = getRoomRoundActions(room, 1);
      io.to(room.code).emit('room:updated', {
        room,
        roundInfo: ROUNDS_DATA[0],
        roundActions: currentRoundActions
      });

      // Update Inspector Modal on Admin Screen
      const eco = calculateLorenzAndGini(room.players);
      socket.emit('master:district_details', {
        room,
        eco,
        roundInfo: ROUNDS_DATA[0]
      });

      broadcastNationalUpdate({
        type: 'reset',
        message: `🔄 ผู้ดูแลระบบรีเซ็ต ${room.districtName} (${room.code}) กลับสู่สถานะเริ่มต้นเรียบร้อยแล้ว`
      });

      console.log(`[Admin] Reset district ${room.code}`);
    });

    // ---------------------------------------------------------
    // QUICK JOIN MASTER (Single QR Code for 200 Players)
    // ---------------------------------------------------------
    socket.on('player:quick_join_master', ({ playerName }) => {
      const { room, player, autoStarted } = quickJoinMaster(playerName, socket.id);
      socket.roomCode = room.code;
      socket.playerId = player.id;
      socket.join(room.code);

      console.log(`[Quick Join] Player ${player.name} (${player.className}) assigned to ${room.districtName} (${room.code}) - Total: ${room.players.length}/10`);

      const currentRoundActions = getRoomRoundActions(room, room.round);

      // Always initialize local player state & show character reveal card
      socket.emit('player:init', {
        room,
        myPlayer: player,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1],
        roundActions: currentRoundActions
      });

      if (autoStarted) {
        io.to(room.code).emit('room:started', {
          room,
          roundInfo: ROUNDS_DATA[0],
          roundActions: currentRoundActions
        });
        io.to(room.code).emit('room:updated', { 
          room,
          roundInfo: ROUNDS_DATA[0],
          roundActions: currentRoundActions
        });
        pregenerateNextRoundActions(room);

        broadcastNationalUpdate({
          type: 'start',
          message: `🚀 ${room.districtName} มีสมาชิกครบ 10 คนแล้ว! เริ่มต้นการจำลองเศรษฐกิจรอบที่ 1 ทันที`
        });
      } else {
        io.to(room.code).emit('room:updated', { 
          room,
          roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1],
          roundActions: currentRoundActions
        });

        // Notify Master Screen of new player
        broadcastNationalUpdate({
          type: 'join',
          message: `👤 ${player.name} เข้าร่วมเป็น "${player.className}" ใน ${room.districtName} (${room.players.length}/10 คน)`
        });
      }
    });

    // ---------------------------------------------------------
    // CREATE CUSTOM ROOM (Play with Friends)
    // ---------------------------------------------------------
    socket.on('player:create_custom_room', ({ playerName, customCode } = {}) => {
      const { room, player, autoStarted } = createCustomDistrict(playerName, socket.id, customCode);
      socket.roomCode = room.code;
      socket.playerId = player.id;
      socket.join(room.code);

      console.log(`[Create Room] Player ${player.name} created new district ${room.districtName} (${room.code})`);

      const currentRoundActions = getRoomRoundActions(room, room.round);

      socket.emit('player:init', {
        room,
        myPlayer: player,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1],
        roundActions: currentRoundActions
      });

      socket.emit('room:created', { roomCode: room.code, room });

      io.to(room.code).emit('room:updated', {
        room,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1],
        roundActions: currentRoundActions
      });

      broadcastNationalUpdate({
        type: 'create',
        message: `🏠 สร้าง ${room.districtName} (${room.code}) ใหม่ โดย ${player.name}`
      });
    });

    // ---------------------------------------------------------
    // PLAYER RECONNECT (Seamless session restore on refresh)
    // ---------------------------------------------------------
    socket.on('player:reconnect', ({ playerId, roomCode }) => {
      const cleanCode = (roomCode || '').toUpperCase().trim();
      const room = rooms.get(cleanCode);

      if (!room) {
        socket.emit('player:reconnect_failed', {
          reason: 'room_not_found',
          message: 'ไม่พบห้องเดิม (ห้องอาจถูกปิดหรือเซิร์ฟเวอร์ถูกรีสตาร์ท)'
        });
        return;
      }

      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        socket.emit('player:reconnect_failed', {
          reason: 'player_not_found',
          message: 'ไม่พบข้อมูลตัวละครเดิมในห้องนี้'
        });
        return;
      }

      // Clear any pending disconnect takeover timer
      if (disconnectTimers.has(player.id)) {
        clearTimeout(disconnectTimers.get(player.id));
        disconnectTimers.delete(player.id);
      }

      // Re-bind player to this socket connection
      player.socketId = socket.id;
      player.isDisconnected = false;
      socket.roomCode = cleanCode;
      socket.playerId = player.id;
      socket.join(cleanCode);

      console.log(`[Player Reconnected] ${player.name} (${player.className}) resumed in ${room.districtName} (${cleanCode})`);

      const currentRoundActions = getRoomRoundActions(room, room.round);
      socket.emit('player:reconnected', {
        room,
        myPlayer: player,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1],
        roundActions: currentRoundActions
      });

      // Update other players in district that this player is back
      io.to(cleanCode).emit('room:updated', { 
        room,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1],
        roundActions: currentRoundActions
      });
    });

    // ---------------------------------------------------------
    // D20 ROLL & ACTION RESOLUTION
    // ---------------------------------------------------------
    socket.on('player:roll_d20', async ({ actionId } = {}) => {
      try {
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

        // Auto roll for any AI bots in this district that haven't rolled yet
        autoRollDistrictBots(room);

        // Check if all connected human players in this district have now rolled.
        // If so, take over any remaining disconnected players immediately!
        const unrolledConnected = room.players.filter(p => !p.isBot && !p.isDisconnected && !p.hasRolledThisRound);
        if (unrolledConnected.length === 0) {
          const takenOver = autoTakeoverInactivePlayers(room);
          autoRollDistrictBots(room);
          if (takenOver.length > 0) {
            io.to(roomCode).emit('room:bot_takeover', {
              message: `🤖 บอทช่วยเล่นแทนผู้เล่นที่หลุดการเชื่อมต่อ (${takenOver.map(t => t.player.name).join(', ')}) เรียบร้อยแล้ว`
            });
          }
        }

        // Emit update to the district party
        io.to(roomCode).emit('room:updated', { room });

        // Prepare Live Ticker notification for Master Screen
        let tickerMsg = `${player.name} (${room.districtName}): ${rollResult.outcomeTitle}`;
        if (rollResult.isNat20) {
          tickerMsg = `🎉 [ได้ 20 แต้มเต็ม!] ${player.name} (${room.districtName}) ทำตามแผน ${rollResult.actionName} ได้ผลยอดเยี่ยมมาก!`;
        } else if (rollResult.isNat1) {
          tickerMsg = `⚠️ [ได้ 1 แต้ม!] ${player.name} (${room.districtName}) พบอุปสรรคและต้นทุนสูงขึ้นในการ ${rollResult.actionName}`;
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
      } catch (err) {
        console.error('[Roll Handler] Error processing D20 roll:', err);
        socket.emit('roll_error', 'เกิดข้อผิดพลาดในการประมวลผลการทอยเต๋า กรุณาลองใหม่อีกครั้ง');
      }
    });

    // ---------------------------------------------------------
    // DISTRICT CONTROLS (Advance Chapter, Bot Takeover, Fill Bots)
    // ---------------------------------------------------------
    socket.on('district:takeover_disconnected', () => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room || room.status !== 'playing') return;

      const takenOver = autoTakeoverInactivePlayers(room);
      autoRollDistrictBots(room);
      io.to(roomCode).emit('room:updated', { room });
      if (takenOver.length > 0) {
        io.to(roomCode).emit('room:bot_takeover', {
          message: `🤖 บอทเข้าช่วยเล่นแทนผู้เล่นที่หลุดการเชื่อมต่อ (${takenOver.map(t => t.player.name).join(', ')}) ทันที!`
        });
      }
    });

    socket.on('district:advance_round', () => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      // Rate limiting / debounce guard to prevent rapid duplicate advance
      const now = Date.now();
      if (room._lastAdvanceTime && (now - room._lastAdvanceTime < 1500)) {
        console.warn(`[Advance Round] Ignored rapid duplicate advance for room ${roomCode}`);
        return;
      }
      room._lastAdvanceTime = now;

      // Force auto-takeover for any inactive/disconnected players before advancing
      autoTakeoverInactivePlayers(room, true);
      // Auto roll for AI bots before advancing
      autoRollDistrictBots(room);

      // Settle economics for this chapter
      const settlement = processDistrictSettlement(room);

      if (room.round < room.maxRounds) {
        room.round += 1;
        room.currentRoundData = ROUNDS_DATA[room.round - 1];
        room.phase = 'action';
        // Security: Reset round roll eligibility for all players in district
        room.players.forEach(p => { p.hasRolledThisRound = false; p.lastAiLore = null; });
      } else {
        room.status = 'gameover';
        room.phase = 'dashboard';
        const finalEval = evaluateFinalResults(room);
        io.to(roomCode).emit('game_over', { room, finalEval });
      }

      const currentRoundActions = getRoomRoundActions(room, room.round);
      io.to(roomCode).emit('room:updated', {
        room,
        settlement,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1],
        roundActions: currentRoundActions
      });
      pregenerateNextRoundActions(room);

      broadcastNationalUpdate({
        type: 'advance',
        message: `🚩 ${room.districtName} เข้าสู่ ${ROUNDS_DATA[room.round - 1].chapterName}`
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
        message: `🤖 ${room.districtName} เติมบอทครบ 10 คนแล้ว พร้อมเริ่มเล่น!`
      });
    });

    socket.on('district:start_with_bots', () => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      const room = startDistrictWithBots(roomCode);
      if (!room) return;

      const currentRoundActions = getRoomRoundActions(room, 1);
      io.to(roomCode).emit('room:started', { room, roundInfo: ROUNDS_DATA[0], roundActions: currentRoundActions });
      io.to(roomCode).emit('room:updated', { room, roundInfo: ROUNDS_DATA[0], roundActions: currentRoundActions });
      pregenerateNextRoundActions(room);

      broadcastNationalUpdate({
        type: 'start',
        message: `🚀 ${room.districtName} สมาชิกครบ 10 คนแล้ว (เติมบอท 🤖 สมบูรณ์) เริ่มต้นรอบที่ 1!`
      });
      console.log(`[District Started with Bots] ${room.districtName} (${roomCode})`);
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

      if (isProjector) {
        socket.join(cleanCode);
        socket.roomCode = cleanCode;
        room.hostSocketId = socket.id;
        socket.emit('joined_as_projector', { roomCode: cleanCode, room });
        return;
      }

      // Check existing player or add to specific district
      let player = room.players.find(p => p.socketId === socket.id);
      let autoStarted = false;

      if (!player) {
        const result = joinSpecificDistrict(cleanCode, playerName, socket.id);
        if (result.error) {
          socket.emit('join_error', result.error);
          return;
        }
        room = result.room;
        player = result.player;
        autoStarted = result.autoStarted;
      }

      socket.join(cleanCode);
      socket.roomCode = cleanCode;
      socket.playerId = player.id;

      const currentRoundActions = getRoomRoundActions(room, room.round);

      // Always initialize local player state & show character reveal card
      socket.emit('player:init', {
        room,
        myPlayer: player,
        roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1],
        roundActions: currentRoundActions
      });

      if (autoStarted) {
        io.to(cleanCode).emit('room:started', {
          room,
          roundInfo: ROUNDS_DATA[0],
          roundActions: currentRoundActions
        });
        io.to(cleanCode).emit('room:updated', { 
          room,
          roundInfo: ROUNDS_DATA[0],
          roundActions: currentRoundActions
        });
        pregenerateNextRoundActions(room);

        broadcastNationalUpdate({
          type: 'start',
          message: `🚀 ${room.districtName} มีสมาชิกครบ 10 คนแล้ว! เริ่มต้นการจำลองเศรษฐกิจรอบที่ 1 ทันที`
        });
      } else {
        io.to(cleanCode).emit('room:updated', { 
          room,
          roundInfo: room.currentRoundData || ROUNDS_DATA[room.round - 1],
          roundActions: currentRoundActions
        });

        broadcastNationalUpdate({
          type: 'join',
          message: `👤 ${player.name} เข้าร่วมเป็น "${player.className}" ใน ${room.districtName} (${room.players.length}/10 คน)`
        });
      }
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
            message: `⚠️ ${player.name} ขาดการเชื่อมต่อ (ระบบจะใช้บอท 🤖 ช่วยเล่นแทนอัตโนมัติ)`
          });
          console.log(`[Player Marked Disconnected] ${player.name} in ${room.districtName}`);

          if (room.status === 'playing') {
            // Check if all remaining connected human players have already rolled
            const unrolledConnected = room.players.filter(p => !p.isBot && !p.isDisconnected && !p.hasRolledThisRound);
            
            if (unrolledConnected.length === 0) {
              // All connected players are already done rolling! Immediately take over so game doesn't stall!
              console.log(`[Instant Takeover] All connected players already rolled in ${room.districtName}. Bot taking over for ${player.name}`);
              const takenOver = autoTakeoverInactivePlayers(room);
              autoRollDistrictBots(room);
              io.to(code).emit('room:updated', { room });
              if (takenOver.length > 0) {
                io.to(code).emit('room:bot_takeover', {
                  playerName: player.name,
                  message: `🤖 บอทเข้าช่วยเล่นแทน ${player.name} ที่หลุดการเชื่อมต่อเรียบร้อยแล้ว`
                });
              }
            } else {
              // Start a 10s grace timeout before taking over for this player
              if (disconnectTimers.has(player.id)) {
                clearTimeout(disconnectTimers.get(player.id));
              }
              const timer = setTimeout(() => {
                disconnectTimers.delete(player.id);
                if (room.status === 'playing' && player.isDisconnected && !player.hasRolledThisRound) {
                  console.log(`[Disconnect Timer Expired] Triggering bot takeover for ${player.name} in ${room.districtName}`);
                  const takenOver = autoTakeoverInactivePlayers(room);
                  autoRollDistrictBots(room);
                  io.to(code).emit('room:updated', { room });
                  if (takenOver.length > 0) {
                    io.to(code).emit('room:bot_takeover', {
                      playerName: player.name,
                      message: `🤖 บอทเข้าช่วยเล่นแทน ${player.name} ที่หลุดการเชื่อมต่อเรียบร้อยแล้ว`
                    });
                  }
                }
              }, 10000); // 10 seconds grace period
              disconnectTimers.set(player.id, timer);
            }
          }
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
