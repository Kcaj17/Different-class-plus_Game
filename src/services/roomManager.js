// =========================================================
// roomManager.js — D&D Economic Chronicles: Dynamic On-Demand District Manager
// Supports Dynamic Unlimited Districts & Players + Master Screen
// =========================================================

const { ROLE_TEMPLATES, ROUNDS_DATA, THEMATIC_ROUND_ACTIONS } = require('../constants/gameData');
const { calculateLorenzAndGini } = require('../engine/economicsEngine');
const { sanitizeText } = require('../utils/security');

// Rooms storage: Map<roomCode, room>
const rooms = new Map();

// Master Session Configuration
const MASTER_SESSION_CODE = 'ECO-MASTER';
const PLAYERS_PER_DISTRICT = 10;

// Find the next sequential district code (DIST-01, DIST-02, DIST-03...)
function getNextDistrictCode() {
  let index = 1;
  while (true) {
    const pad = index < 10 ? `0${index}` : `${index}`;
    const code = `DIST-${pad}`;
    if (!rooms.has(code)) {
      return { code, index };
    }
    index++;
  }
}

// Optional legacy helper: initialize empty districts if needed
function initializeMasterDistricts() {
  // On-demand architecture: no empty districts pre-created
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a District Room (DND Economic Party)
function createDistrictRoom(roomCode, districtIndex = null, hostSocketId = null) {
  let calculatedIndex = districtIndex;
  if (!calculatedIndex && typeof roomCode === 'string' && roomCode.startsWith('DIST-')) {
    const numPart = parseInt(roomCode.replace('DIST-', ''), 10);
    if (!isNaN(numPart)) calculatedIndex = numPart;
  }
  if (!calculatedIndex) {
    calculatedIndex = rooms.size + 1;
  }

  const room = {
    code: roomCode,
    districtIndex: calculatedIndex,
    districtName: `เขตเศรษฐกิจที่ ${calculatedIndex}`,
    hostSocketId: hostSocketId,
    status: 'waiting', // Wait in assembly hall until 10 players or started
    round: 1,
    maxRounds: 6,
    phase: 'action', // 'lore' | 'action' | 'settlement' | 'dashboard'
    phaseTimer: 0,
    macroStats: {
      gdp: 1000000,
      debtToGdp: 62.0, // Base debt ratio 62.0%
      totalVelocity: 0,
      totalVatCollected: 0,
      totalCoPaySubsidies: 0,
      gini: 0.45,
      crisisAlert: null
    },
    players: [],
    roundActions: {
      1: THEMATIC_ROUND_ACTIONS[1]
    },
    actionLog: [],
    d20Logs: [],
    autoBotFill: true,
    availableRoles: shuffleArray(JSON.parse(JSON.stringify(ROLE_TEMPLATES)))
  };

  rooms.set(roomCode, room);
  return room;
}

// Fisher-Yates Shuffle Algorithm
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Check if the master game has already started (at least one district is playing or gameover)
function isMasterGameStarted() {
  for (const r of rooms.values()) {
    if (r.status === 'playing' || r.status === 'gameover') {
      return true;
    }
  }
  return false;
}

// Get the active round, phase, and roundData from currently playing districts
function getMasterGameProgress() {
  for (const r of rooms.values()) {
    if (r.status === 'playing') {
      return {
        round: r.round,
        phase: r.phase,
        currentRoundData: r.currentRoundData || ROUNDS_DATA[r.round - 1]
      };
    }
  }
  return {
    round: 1,
    phase: 'action',
    currentRoundData: ROUNDS_DATA[0]
  };
}

// Helper: Add player to a specific district room with role assignment and auto-start check
function addPlayerToDistrictRoom(room, playerName, socketId) {
  // Ensure available roles are initialized
  if (!room.availableRoles || room.availableRoles.length === 0) {
    room.availableRoles = shuffleArray(JSON.parse(JSON.stringify(ROLE_TEMPLATES)));
  }

  // Assign random role based on Rawlsian Veil of Ignorance
  const roleTemplate = room.availableRoles.pop();

  const cleanName = sanitizeText(playerName, 24);
  const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 12)}_${Math.floor(Math.random() * 10000)}`;
  const player = {
    socketId: socketId,
    id: `${roleTemplate.id}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    sessionToken: sessionToken,
    name: cleanName && cleanName !== '' ? cleanName : roleTemplate.title,
    isBot: false,
    isDisconnected: false,
    ...roleTemplate,
    cash: roleTemplate.initialCash,
    businessValue: roleTemplate.roleType === 'capitalist' ? 300000 : (roleTemplate.roleType === 'sme_vendor' ? 30000 : 0),
    qol: roleTemplate.initialHp || 50,
    debt: 0,
    skillLevel: 1,
    digitalFootprint: 0,
    lastD20Roll: null,
    lastActionDesc: null,
    lastAiLore: null,
    hasRolledThisRound: false
  };

  room.players.push(player);

  let autoStarted = false;

  // Auto-Start: If this room reaches 10 players, start playing automatically!
  if (room.players.length >= PLAYERS_PER_DISTRICT) {
    room.status = 'playing';
    room.round = 1;
    room.phase = 'action';
    room.currentRoundData = ROUNDS_DATA[0];
    room.players.forEach(p => { p.hasRolledThisRound = false; p.lastAiLore = null; });
    autoStarted = true;
  }

  // Recalculate Lorenz & Gini
  const eco = calculateLorenzAndGini(room.players);
  room.macroStats.gini = eco.gini;

  return { player, autoStarted };
}

// Auto-Matchmaking: Consolidate Humans First into waiting rooms (< 10), otherwise dynamically create new room
function quickJoinMaster(playerName, socketId) {
  let targetRoom = null;

  // 1. Search for an open waiting district (< 10 players)
  for (const room of rooms.values()) {
    if (room.status === 'waiting' && room.players.length < PLAYERS_PER_DISTRICT) {
      targetRoom = room;
      break;
    }
  }

  // 2. If no open waiting room exists (or all existing rooms are full / playing), dynamically create a new sequential district
  if (!targetRoom) {
    const { code, index } = getNextDistrictCode();
    targetRoom = createDistrictRoom(code, index);
  }

  const { player, autoStarted } = addPlayerToDistrictRoom(targetRoom, playerName, socketId);

  return { room: targetRoom, player, autoStarted };
}

// Create a new custom district (for playing with friends)
function createCustomDistrict(playerName, socketId, customCode = null) {
  let targetCode = null;
  let targetIndex = null;

  if (customCode) {
    const clean = sanitizeText(customCode, 8).toUpperCase().trim();
    if (clean && !rooms.has(clean)) {
      targetCode = clean;
    }
  }

  if (!targetCode) {
    const next = getNextDistrictCode();
    targetCode = next.code;
    targetIndex = next.index;
  }

  const targetRoom = createDistrictRoom(targetCode, targetIndex, socketId);
  const { player, autoStarted } = addPlayerToDistrictRoom(targetRoom, playerName, socketId);

  return { room: targetRoom, player, autoStarted };
}

// Join a specific district manually (e.g. typing DIST-02 or custom room code)
function joinSpecificDistrict(roomCode, playerName, socketId) {
  const cleanCode = (roomCode || '').toUpperCase().trim();
  let room = rooms.get(cleanCode);

  if (!room) {
    return { error: `ไม่พบห้องรหัส "${cleanCode}" กรุณาตรวจสอบรหัสห้องอีกครั้ง` };
  }

  if (room.status !== 'waiting') {
    return { error: `กลุ่ม ${room.districtName} (${cleanCode}) ได้เริ่มเล่นไปแล้ว ไม่สามารถเข้าร่วมได้` };
  }

  if (room.players.length >= PLAYERS_PER_DISTRICT) {
    return { error: `กลุ่ม ${room.districtName} (${cleanCode}) มีสมาชิกครบ 10 คนแล้ว กรุณาเลือกกลุ่มอื่นหรือสร้างกลุ่มใหม่` };
  }

  const { player, autoStarted } = addPlayerToDistrictRoom(room, playerName, socketId);

  return { room, player, autoStarted };
}

// Kick a specific player from a district (Admin command)
function kickPlayerFromDistrict(roomCode, playerId) {
  const cleanCode = (roomCode || '').toUpperCase().trim();
  const room = rooms.get(cleanCode);
  if (!room) return { error: 'ไม่พบห้องนี้ในระบบ' };

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return { error: 'ไม่พบผู้เล่นนี้ในห้อง' };

  const kickedPlayer = room.players[playerIndex];

  if (room.status === 'waiting') {
    // In waiting state: Remove player and restore their role back to availableRoles
    room.players.splice(playerIndex, 1);

    // Find template for this role to put back into availableRoles
    const template = ROLE_TEMPLATES.find(t => t.id === kickedPlayer.roleType || t.title === kickedPlayer.title);
    if (template) {
      if (!room.availableRoles) room.availableRoles = [];
      room.availableRoles.push(JSON.parse(JSON.stringify(template)));
      room.availableRoles = shuffleArray(room.availableRoles);
    }
  } else {
    // In playing / active state: Replace human with AI Bot so 10-person macro economy doesn't break
    const botTemplate = ROLE_TEMPLATES.find(t => t.id === kickedPlayer.roleType || t.title === kickedPlayer.title) || {
      id: kickedPlayer.roleType || 'laborer',
      title: kickedPlayer.title || 'พนักงาน/แรงงาน',
      initialCash: kickedPlayer.cash || 10000,
      initialHp: 50
    };

    const replacementBot = {
      socketId: `bot_${botTemplate.id}_${Date.now()}_${Math.random()}`,
      id: `${botTemplate.id}_bot_${Math.floor(Math.random()*1000)}`,
      name: `${kickedPlayer.className || kickedPlayer.title || 'สมาชิก'} 🤖`,
      isBot: true,
      isDisconnected: false,
      ...botTemplate,
      cash: kickedPlayer.cash,
      businessValue: kickedPlayer.businessValue || 0,
      qol: kickedPlayer.qol || 50,
      debt: kickedPlayer.debt || 0,
      skillLevel: kickedPlayer.skillLevel || 1,
      digitalFootprint: kickedPlayer.digitalFootprint || 0,
      lastD20Roll: null,
      lastActionDesc: null,
      lastAiLore: null,
      hasRolledThisRound: false
    };

    room.players[playerIndex] = replacementBot;
  }

  // Recalculate Gini
  const eco = calculateLorenzAndGini(room.players);
  room.macroStats.gini = eco.gini;

  return { success: true, room, kickedPlayer };
}

// Reset a specific district back to initial clean waiting state (Admin command)
function resetSpecificDistrict(roomCode) {
  const cleanCode = (roomCode || '').toUpperCase().trim();
  const room = rooms.get(cleanCode);
  if (!room) return { error: 'ไม่พบห้องนี้ในระบบ' };

  const prevPlayers = [...room.players];

  // Reset room properties
  room.status = 'waiting';
  room.round = 1;
  room.phase = 'action';
  room.phaseTimer = 0;
  room.currentRoundData = ROUNDS_DATA[0];
  room.macroStats = {
    gdp: 1000000,
    debtToGdp: 62.0,
    totalVelocity: 0,
    totalVatCollected: 0,
    totalCoPaySubsidies: 0,
    gini: 0.45,
    crisisAlert: null
  };
  room.players = [];
  room.roundActions = {
    1: THEMATIC_ROUND_ACTIONS[1]
  };
  room.actionLog = [];
  room.d20Logs = [];
  room.autoBotFill = true;
  room.availableRoles = shuffleArray(JSON.parse(JSON.stringify(ROLE_TEMPLATES)));

  return { success: true, room, prevPlayers };
}

// Auto-fill district with bot adventurers if requested or needed
function fillDistrictBots(room) {
  while (room.players.length < PLAYERS_PER_DISTRICT && room.availableRoles && room.availableRoles.length > 0) {
    const template = room.availableRoles.pop();
    const botPlayer = {
      socketId: `bot_${template.id}_${Date.now()}_${Math.random()}`,
      id: `${template.id}_bot_${Math.floor(Math.random()*1000)}`,
      name: `${template.title} 🤖`,
      isBot: true,
      isDisconnected: false,
      ...template,
      cash: template.initialCash,
      businessValue: template.roleType === 'capitalist' ? 300000 : (template.roleType === 'sme_vendor' ? 30000 : 0),
      qol: template.initialHp || 50,
      debt: 0,
      skillLevel: 1,
      digitalFootprint: 0,
      lastD20Roll: null,
      lastActionDesc: null,
      lastAiLore: null,
      hasRolledThisRound: false
    };
    room.players.push(botPlayer);
  }

  const eco = calculateLorenzAndGini(room.players);
  room.macroStats.gini = eco.gini;
}

// Finalize all active waiting districts when Master starts game:
// 1. Districts with humans: fill incomplete slots up to 10 with bots and start playing
// 2. Districts with 0 humans: remove from active rooms
function finalizeDistrictsAndBots() {
  let activeCount = 0;
  const toDelete = [];

  for (const [code, room] of rooms.entries()) {
    const humanCount = room.players.filter(p => !p.isBot).length;
    if (room.status === 'waiting') {
      if (humanCount > 0) {
        room.status = 'playing';
        room.round = 1;
        room.phase = 'action';
        room.currentRoundData = ROUNDS_DATA[0];
        room.players.forEach(p => { p.hasRolledThisRound = false; p.lastAiLore = null; });
        fillDistrictBots(room);
        activeCount++;
      } else {
        toDelete.push(code);
      }
    } else if (room.status === 'playing') {
      activeCount++;
    }
  }

  // Remove empty waiting rooms
  toDelete.forEach(code => rooms.delete(code));

  // If no one joined at all, create District 1 with 10 bots for demo
  if (activeCount === 0 && rooms.size === 0) {
    const d1 = createDistrictRoom('DIST-01', 1);
    d1.status = 'playing';
    d1.round = 1;
    d1.phase = 'action';
    d1.currentRoundData = ROUNDS_DATA[0];
    fillDistrictBots(d1);
    activeCount = 1;
  }

  return activeCount;
}

// Start a specific district immediately with bots (for solo or small-party play)
function startDistrictWithBots(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  fillDistrictBots(room);
  room.status = 'playing';
  room.round = 1;
  room.phase = 'action';
  room.currentRoundData = ROUNDS_DATA[0];
  room.players.forEach(p => { p.hasRolledThisRound = false; });

  const eco = calculateLorenzAndGini(room.players);
  room.macroStats.gini = eco.gini;

  return room;
}

// Aggregate National Economics for the Master Screen Dashboard (Unlimited Dynamic Districts)
function getNationalAggregates() {
  let totalGdp = 0;
  let totalVat = 0;
  let totalCoPay = 0;
  let totalPlayersCount = 0;
  let totalHumanCount = 0;
  let giniSum = 0;
  let debtSum = 0;
  let activeDistrictsCount = 0;
  let crisesCount = 0;

  const districtsSummary = [];

  // Sort rooms sequentially by districtIndex or room code
  const sortedRooms = Array.from(rooms.values()).sort((a, b) => {
    if (a.districtIndex && b.districtIndex) return a.districtIndex - b.districtIndex;
    return (a.code || '').localeCompare(b.code || '');
  });

  for (const room of sortedRooms) {
    const humans = room.players.filter(p => !p.isBot).length;
    const totalP = room.players.length;
    const isClosed = room.status === 'closed';

    totalPlayersCount += totalP;
    totalHumanCount += humans;

    // Only count active rooms (rooms with players that are not closed) towards national aggregates
    if (totalP > 0 && !isClosed) {
      totalGdp += room.macroStats.gdp;
      totalVat += room.macroStats.totalVatCollected;
      totalCoPay += room.macroStats.totalCoPaySubsidies;
      giniSum += room.macroStats.gini;
      debtSum += room.macroStats.debtToGdp;
      activeDistrictsCount++;

      if (room.macroStats.crisisAlert) {
        crisesCount++;
      }
    }

    // Average QoL for this district
    const avgQol = totalP > 0
      ? Math.round(room.players.reduce((sum, p) => sum + (p.qol || 50), 0) / totalP)
      : 50;

    districtsSummary.push({
      districtIndex: room.districtIndex,
      code: room.code,
      name: room.districtName,
      status: room.status,
      isClosed: isClosed,
      round: room.round,
      maxRounds: room.maxRounds,
      phase: room.phase,
      gini: Number(room.macroStats.gini.toFixed(3)),
      debtToGdp: Number(room.macroStats.debtToGdp.toFixed(1)),
      gdp: room.macroStats.gdp,
      humanPlayers: humans,
      totalPlayers: totalP,
      avgQol: avgQol,
      hasCrisis: !!room.macroStats.crisisAlert,
      crisisAlert: room.macroStats.crisisAlert,
      lastD20Rolls: (room.d20Logs || []).slice(-3)
    });
  }

  const avgGini = activeDistrictsCount > 0 ? Number((giniSum / activeDistrictsCount).toFixed(3)) : 0.450;
  const avgDebtToGdp = activeDistrictsCount > 0 ? Number((debtSum / activeDistrictsCount).toFixed(1)) : 62.0;

  // Compute 3-Philosophy Leaderboard
  const sortedByGini = [...districtsSummary].filter(d => !d.isClosed && d.totalPlayers > 0).sort((a, b) => a.gini - b.gini);
  const sortedByQol = [...districtsSummary].filter(d => !d.isClosed && d.totalPlayers > 0).sort((a, b) => b.avgQol - a.avgQol);
  const sortedByDebt = [...districtsSummary].filter(d => !d.isClosed && d.totalPlayers > 0).sort((a, b) => a.debtToGdp - b.debtToGdp);

  return {
    masterSessionCode: MASTER_SESSION_CODE,
    totalDistricts: rooms.size,
    totalDistrictsCount: rooms.size,
    activeDistrictsCount,
    totalPlayersCount,
    totalHumanCount,
    nationalMacro: {
      avgGini,
      avgDebtToGdp,
      totalGdp,
      totalVat,
      totalCoPay,
      crisesCount,
      safeDistrictsCount: Math.max(0, activeDistrictsCount - crisesCount)
    },
    districtsSummary,
    leaderboard: {
      mostEqualDistrict: sortedByGini[0] || null,
      highestHappinessDistrict: sortedByQol[0] || null,
      fiscallyPrudentDistrict: sortedByDebt[0] || null
    }
  };
}

function getRoomRoundActions(room, roundNumber) {
  const r = roundNumber || (room ? room.round : 1) || 1;
  if (room && room.roundActions && room.roundActions[r]) {
    return room.roundActions[r];
  }
  return THEMATIC_ROUND_ACTIONS[r] || THEMATIC_ROUND_ACTIONS[1];
}

module.exports = {
  rooms,
  MASTER_SESSION_CODE,
  PLAYERS_PER_DISTRICT,
  getNextDistrictCode,
  initializeMasterDistricts,
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
  getRoomRoundActions,
  isMasterGameStarted,
  getMasterGameProgress
};
