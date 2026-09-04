// =========================================================
// roomManager.js — D&D Economic Chronicles: District & Matchmaking Manager
// Supports 200 Players (20 Districts x 10 Players) + Master Screen
// =========================================================

const { ROLE_TEMPLATES, ROUNDS_DATA, THEMATIC_ROUND_ACTIONS } = require('../constants/gameData');
const { calculateLorenzAndGini } = require('../engine/economicsEngine');
const { sanitizeText } = require('../utils/security');

// Rooms storage: Map<roomCode, room>
const rooms = new Map();

// Master Session Configuration
const MASTER_SESSION_CODE = 'ECO-200';
const TOTAL_DISTRICTS = 20;
const PLAYERS_PER_DISTRICT = 10;

// Initialize the 20 Economic Districts (Districts 1..20)
function initializeMasterDistricts() {
  for (let i = 1; i <= TOTAL_DISTRICTS; i++) {
    const pad = i < 10 ? `0${i}` : `${i}`;
    const code = `DIST-${pad}`;
    if (!rooms.has(code)) {
      createDistrictRoom(code, i);
    }
  }
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
function createDistrictRoom(roomCode, districtIndex = 1, hostSocketId = null) {
  const room = {
    code: roomCode,
    districtIndex: districtIndex,
    districtName: `เขตเศรษฐกิจที่ ${districtIndex}`,
    hostSocketId: hostSocketId,
    status: 'waiting', // Wait in assembly hall until 10 players or bots fill
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

// Auto-Matchmaking: Consolidate Humans First (Fill District 1 -> 2 -> 3...)
// In-Game (แนวทางที่ 2): Lock active full districts and route late joiners to a new district!
function quickJoinMaster(playerName, socketId) {
  initializeMasterDistricts();

  const gameStarted = isMasterGameStarted();
  let targetRoom = null;

  if (!gameStarted) {
    // ---------------------------------------------------------
    // Case 1: LOBBY / PRE-GAME
    // Consolidate humans sequentially: Fill District 1 (up to 10) -> District 2 -> etc.
    // ---------------------------------------------------------
    for (let i = 1; i <= TOTAL_DISTRICTS; i++) {
      const pad = i < 10 ? `0${i}` : `${i}`;
      const code = `DIST-${pad}`;
      const room = rooms.get(code);
      if (!room) continue;

      if (room.players.length < PLAYERS_PER_DISTRICT) {
        targetRoom = room;
        break;
      }
    }
  } else {
    // ---------------------------------------------------------
    // Case 2: GAME ALREADY STARTED (แนวทางที่ 2)
    // Any district that is already 'playing' with full capacity (10 players) is LOCKED.
    // Late joiners MUST be routed to a new district!
    // ---------------------------------------------------------
    for (let i = 1; i <= TOTAL_DISTRICTS; i++) {
      const pad = i < 10 ? `0${i}` : `${i}`;
      const code = `DIST-${pad}`;
      const room = rooms.get(code);
      if (!room) continue;

      // Skip districts that are already playing and full (10 players)
      if (room.status === 'playing' && room.players.length >= PLAYERS_PER_DISTRICT) {
        continue;
      }

      // Found an open / closed / not-full district
      targetRoom = room;
      break;
    }
  }

  if (!targetRoom) {
    // If all 20 districts are completely filled with 10 players, fallback to dynamic district
    const fallbackCode = generateRoomCode();
    targetRoom = createDistrictRoom(fallbackCode, rooms.size + 1);
  }

  // If game is already in progress, synchronize and activate the target district
  if (gameStarted && targetRoom.status !== 'playing') {
    const progress = getMasterGameProgress();
    targetRoom.status = 'playing';
    targetRoom.round = progress.round;
    targetRoom.phase = progress.phase;
    targetRoom.currentRoundData = progress.currentRoundData;
  }

  // Ensure available roles are initialized
  if (!targetRoom.availableRoles || targetRoom.availableRoles.length === 0) {
    targetRoom.availableRoles = shuffleArray(JSON.parse(JSON.stringify(ROLE_TEMPLATES)));
  }

  // Assign random role based on Rawlsian Veil of Ignorance
  const roleTemplate = targetRoom.availableRoles.pop();

  const cleanName = sanitizeText(playerName, 24);
  const player = {
    socketId: socketId,
    id: `${roleTemplate.id}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
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

  targetRoom.players.push(player);

  // If target district is active/playing, auto-fill remaining slots with bots up to exactly 10 players
  // so the district is complete and ready for national macro settlement
  if (targetRoom.status === 'playing') {
    fillDistrictBots(targetRoom);
    targetRoom.players.forEach(p => {
      if (p.isBot) {
        p.hasRolledThisRound = false;
      }
    });
  }

  // Recalculate Lorenz & Gini
  const eco = calculateLorenzAndGini(targetRoom.players);
  targetRoom.macroStats.gini = eco.gini;

  return { room: targetRoom, player };
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

// Finalize all 20 districts when game starts:
// 1. Districts with humans: fill incomplete slots up to 10 with bots
// 2. Districts with 0 humans: mark as 'closed'
function finalizeDistrictsAndBots() {
  initializeMasterDistricts();
  let activeCount = 0;

  for (let i = 1; i <= TOTAL_DISTRICTS; i++) {
    const pad = i < 10 ? `0${i}` : `${i}`;
    const code = `DIST-${pad}`;
    const room = rooms.get(code);
    if (!room) continue;

    const humanCount = room.players.filter(p => !p.isBot).length;
    if (humanCount > 0) {
      room.status = 'playing';
      // Fill remaining roles with bots using Veil of Ignorance
      fillDistrictBots(room);
      activeCount++;
    } else {
      room.status = 'closed';
      room.players = [];
    }
  }

  // If no one joined at all, keep District 1 active with 10 bots for demo
  if (activeCount === 0) {
    const d1 = rooms.get('DIST-01');
    if (d1) {
      d1.status = 'playing';
      fillDistrictBots(d1);
      activeCount = 1;
    }
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

// Aggregate National Economics for the Master Screen Dashboard
function getNationalAggregates() {
  initializeMasterDistricts();

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

  for (let i = 1; i <= TOTAL_DISTRICTS; i++) {
    const pad = i < 10 ? `0${i}` : `${i}`;
    const code = `DIST-${pad}`;
    const room = rooms.get(code);
    if (!room) continue;

    const humans = room.players.filter(p => !p.isBot).length;
    const totalP = room.players.length;

    totalPlayersCount += totalP;
    totalHumanCount += humans;
    totalGdp += room.macroStats.gdp;
    totalVat += room.macroStats.totalVatCollected;
    totalCoPay += room.macroStats.totalCoPaySubsidies;

    if (totalP > 0) {
      giniSum += room.macroStats.gini;
      debtSum += room.macroStats.debtToGdp;
      activeDistrictsCount++;
    }

    if (room.macroStats.crisisAlert) {
      crisesCount++;
    }

    // Average QoL for this district
    const avgQol = totalP > 0
      ? Math.round(room.players.reduce((sum, p) => sum + (p.qol || 50), 0) / totalP)
      : 50;

    const isClosed = room.status === 'closed';

    districtsSummary.push({
      districtIndex: i,
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
    totalDistricts: TOTAL_DISTRICTS,
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
      safeDistrictsCount: TOTAL_DISTRICTS - crisesCount
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
  TOTAL_DISTRICTS,
  PLAYERS_PER_DISTRICT,
  initializeMasterDistricts,
  generateRoomCode,
  createDistrictRoom,
  quickJoinMaster,
  fillDistrictBots,
  startDistrictWithBots,
  finalizeDistrictsAndBots,
  getNationalAggregates,
  getRoomRoundActions,
  isMasterGameStarted,
  getMasterGameProgress
};
