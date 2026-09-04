// =========================================================
// settlementEngine.js — D&D Economic Chronicles: Settlement Engine
// Handles D20 Dice Checks, Stat Modifiers, and Economic Flow
// =========================================================

const { ROUNDS_DATA, THEMATIC_ROUND_ACTIONS, getModifier } = require('../constants/gameData');
const { calculateLorenzAndGini } = require('./economicsEngine');
const { secureRandomD20 } = require('../utils/security');

// Process a single DND Action + D20 Roll from a player
function resolvePlayerDndRoll(room, player, actionId, forcedD20 = null) {
  const roundInfo = room.currentRoundData || ROUNDS_DATA[room.round - 1];
  
  // Anti-Cheat: Server generates cryptographically secure D20 roll unless explicitly forced by simulator
  const d20 = (typeof forcedD20 === 'number' && forcedD20 >= 1 && forcedD20 <= 20)
    ? forcedD20
    : secureRandomD20();

  // Determine relevant stat and DC based on role & action
  let relevantStatKey = 'lab';
  let dc = roundInfo.defaultDc || 10;
  let actionName = 'ดำเนินกิจกรรมตามหน้าที่การผลิต';
  let actionCategory = 'standard';

  const role = player.roleType;

  // 1. Dynamic AI / Thematic Round Action Lookup
  const currentRoundActions = (room.roundActions && room.roundActions[room.round] && room.roundActions[room.round][role])
    ? room.roundActions[room.round][role]
    : (THEMATIC_ROUND_ACTIONS[room.round]?.[role] || []);

  const matchedAction = currentRoundActions.find(a => a.id === actionId);

  if (matchedAction) {
    relevantStatKey = (matchedAction.statKey || 'lab').toLowerCase();
    dc = matchedAction.dc || 10;
    actionName = matchedAction.name;
    actionCategory = matchedAction.actionCategory;
  } else {
    // 2. Legacy Static Fallback Definitions
    if (role === 'capitalist') {
      if (actionId === 'expand_chain' || actionId.includes('expansion')) {
        relevantStatKey = 'cap';
        dc = 12;
        actionName = 'ขยายสาขาห้างค้าปลีก & ระบบดิจิทัล';
        actionCategory = 'expansion';
      } else if (actionId === 'etax_supply' || actionId.includes('supply')) {
        relevantStatKey = 'dig';
        dc = 11;
        actionName = 'ลงทุนระบบ e-Tax & เครือข่ายโลจิสติกส์';
        actionCategory = 'supply_chain';
      } else {
        relevantStatKey = 'cap';
        dc = 10;
        actionName = 'บริหารพอร์ตลงทุน & ดอกเบี้ยเงินฝาก';
        actionCategory = 'investment';
      }
    } else if (role === 'sme_vendor') {
      if (actionId === 'copay_boost' || actionId.includes('sales')) {
        relevantStatKey = 'dig';
        dc = 10;
        actionName = 'เปิดรับสแกนแอปถุงเงิน 60/40 ดึงดูดลูกค้า';
        actionCategory = 'sales';
      } else if (actionId === 'bank_loan' || actionId.includes('credit')) {
        relevantStatKey = 'inf';
        dc = 13;
        actionName = 'ใช้ Digital Footprint ยื่นกู้สินเชื่อดอกเบี้ยต่ำในระบบ';
        actionCategory = 'credit';
      } else {
        relevantStatKey = 'lab';
        dc = 11;
        actionName = 'สต็อกสินค้า & จัดการร้านค้าชุมชน';
        actionCategory = 'restock';
      }
    } else if (role === 'general_citizen') {
      if (actionId === 'copay_spend_sme' || actionId.includes('copay_sme')) {
        relevantStatKey = 'dig';
        dc = 10;
        actionName = 'ใช้สิทธิไทยช่วยไทย 60/40 อุดหนุนร้านค้าชุมชน';
        actionCategory = 'copay_sme';
      } else if (actionId === 'copay_spend_mall' || actionId.includes('copay_mall')) {
        relevantStatKey = 'dig';
        dc = 10;
        actionName = 'ใช้สิทธิ 60/40 สั่งสินค้าผ่านแพลตฟอร์ม/ห้างใหญ่';
        actionCategory = 'copay_mall';
      } else if (actionId === 'upgrade_skill' || actionId.includes('skill')) {
        relevantStatKey = 'lab';
        dc = 12;
        actionName = 'เข้าศึกษาอบรมพัฒนาทักษะอาชีพ (Skill Upgrading)';
        actionCategory = 'skill_up';
      } else {
        relevantStatKey = 'lab';
        dc = 10;
        actionName = 'ทำงานล่วงเวลาสะสมเงินออม';
        actionCategory = 'work';
      }
    } else if (role === 'vulnerable_group') {
      if (actionId === 'claim_welfare' || actionId.includes('welfare_direct')) {
        relevantStatKey = 'dig';
        dc = 9;
        actionName = 'เบิกรับเงินโอนสวัสดิการแห่งรัฐ 1,000 บาท';
        actionCategory = 'welfare_direct';
      } else if (actionId === 'buy_essentials' || actionId.includes('welfare_shop')) {
        relevantStatKey = 'lab';
        dc = 9;
        actionName = 'ใช้บัตรสวัสดิการซื้อข้าวสารอาหารแห้งร้านธงฟ้า';
        actionCategory = 'welfare_shop';
      } else {
        relevantStatKey = 'inf';
        dc = 10;
        actionName = 'ขอความช่วยเหลือชุมชนก้าวข้าม Digital Divide';
        actionCategory = 'digital_help';
      }
    }
  }

  // Calculate Modifier
  const statVal = player.dndStats ? (player.dndStats[relevantStatKey] || 10) : 10;
  const modifier = getModifier(statVal);
  const totalScore = d20 + modifier;

  const isNat20 = (d20 === 20);
  const isNat1 = (d20 === 1);
  const isSuccess = isNat20 || (!isNat1 && totalScore >= dc);

  // Economic Impact Calculation
  let goldChange = 0;
  let qolChange = 0;
  let debtChange = 0;
  let velocityImpact = 0;
  let vatImpact = 0;
  let coPayImpact = 0;
  let outcomeTitle = '';
  let outcomeDesc = '';

  const smePlayers = room.players.filter(p => p.roleType === 'sme_vendor');
  const capitalist = room.players.find(p => p.roleType === 'capitalist');

  // Outcome resolution per action category
  if (isNat20) {
    outcomeTitle = '🌟 สำเร็จยอดเยี่ยม! (ได้ 20 แต้มเต็ม)';
  } else if (isNat1) {
    outcomeTitle = '⚠️ เกิดปัญหาติดขัด (ได้ 1 แต้ม มีอุปสรรคเกิดขึ้น)';
  } else if (isSuccess) {
    outcomeTitle = `✅ ทำได้สำเร็จ (คะแนน ${totalScore} ผ่านเกณฑ์ ${dc})`;
  } else {
    outcomeTitle = `❌ ยังไม่ผ่านเกณฑ์ (คะแนน ${totalScore} ต่ำกว่าเกณฑ์ ${dc})`;
  }

  // Class specific outcomes
  if (role === 'capitalist') {
    if (actionCategory === 'expansion') {
      if (isSuccess) {
        const cost = 40000;
        if (player.cash >= cost) {
          player.cash -= cost;
          player.businessValue += isNat20 ? 90000 : 65000;
          player.baseIncome += isNat20 ? 18000 : 12000;
          qolChange = isNat20 ? 15 : 10;
          velocityImpact = cost;
          vatImpact = cost * 0.07;
          outcomeDesc = `ขยายสาขาสำเร็จ! ยอดขายพุ่งกระฉูด เพิ่มรายได้ถาวร +${isNat20 ? 18000 : 12000} บ./รอบ`;
        } else {
          outcomeDesc = `สภาพคล่องไม่พอสำหรับการขยายสาขา เสียโอกาสในการลงทุน`;
        }
      } else {
        outcomeDesc = isNat1
          ? `สาขาใหม่ประสบปัญหาข้อพิพาทผังเมือง สูญเสียเงินสำรวจ 15,000 บาท!`
          : `การประเมินทำเลไม่ผ่านเกณฑ์ ชะลอการขยายสาขา`;
        if (isNat1) player.cash = Math.max(0, player.cash - 15000);
      }
    } else {
      goldChange = isNat20 ? 30000 : (isSuccess ? 15000 : 5000);
      qolChange = isSuccess ? 8 : 2;
      outcomeDesc = isSuccess
        ? `พอร์ตกำไรและซัพพลายเชนสร้างผลตอบแทน +${goldChange.toLocaleString()} บาท`
        : `ผลตอบแทนทรงตัวตามภาวะตลาด`;
    }
  } else if (role === 'sme_vendor') {
    if (actionCategory === 'credit') {
      if (isSuccess && player.digitalFootprint >= 1) {
        const loanAmount = isNat20 ? 35000 : 20000;
        goldChange = loanAmount;
        player.businessValue += loanAmount * 1.2;
        player.digitalFootprint += 2;
        qolChange = 12;
        outcomeDesc = `สินเชื่อดอกเบี้ยต่ำ 3% อนุมัติผ่านฉลุย! ได้รับทุนหมุนเวียน +${loanAmount.toLocaleString()} บาท`;
      } else {
        outcomeDesc = isNat1
          ? `ถูกปฏิเสธสินเชื่อและถูกคิดค่าธรรมเนียมตรวจประวัติ 2,000 บาท!`
          : `ประวัติธุรกรรมยังไม่เพียงพอ สินเชื่อไม่อนุมัติ`;
        if (isNat1) player.cash = Math.max(0, player.cash - 2000);
      }
    } else {
      const sales = isNat20 ? 12000 : (isSuccess ? 8000 : 3000);
      goldChange = sales;
      player.digitalFootprint += 1;
      velocityImpact = sales;
      vatImpact = sales * 0.07;
      qolChange = isSuccess ? 10 : 4;
      outcomeDesc = isSuccess
        ? `ลูกค้าแห่สแกนถุงเงิน ยอดขายสะพัด +${sales.toLocaleString()} บาท (สะสมรอยเท้าดิจิทัล)`
        : `ยอดขายค่อนข้างเงียบเหงา ได้รับเพียง +${sales.toLocaleString()} บาท`;
    }
  } else if (role === 'general_citizen') {
    if (actionCategory === 'copay_sme') {
      const totalSpend = 3000;
      let citizenPay = totalSpend;
      if (player.coPayEligible && (room.round === 3 || room.round === 4)) {
        citizenPay = totalSpend * 0.40; // จ่าย 40% รัฐช่วย 60%
        coPayImpact = totalSpend * 0.60;
      }
      if (player.cash >= citizenPay) {
        player.cash -= citizenPay;
        velocityImpact = totalSpend;
        vatImpact = totalSpend * 0.07;
        qolChange = isNat20 ? 18 : (isSuccess ? 12 : 6);

        // Feed to a random SME
        if (smePlayers.length > 0) {
          const targetSme = smePlayers[Math.floor(Math.random() * smePlayers.length)];
          targetSme.cash += totalSpend;
          targetSme.digitalFootprint += 1;
        }

        outcomeDesc = isSuccess
          ? `สแกน 60/40 ซื้อของร้านชุมชนสำเร็จ! จ่ายจริงเพียง ${citizenPay} บ. (รัฐอุดหนุน ${coPayImpact} บ.) สุขภาวะพุ่ง!`
          : `ซื้อของสำเร็จแต่ระบบแอปขัดข้องเล็กน้อย จ่าย ${citizenPay} บ.`;
      } else {
        outcomeDesc = `เงินสดไม่เพียงพอสำหรับซื้อสินค้า`;
      }
    } else if (actionCategory === 'upgrade_skill' || actionCategory === 'skill_up') {
      const fee = 4000;
      if (player.cash >= fee) {
        player.cash -= fee;
        if (isSuccess) {
          player.skillLevel = Math.min(5, player.skillLevel + 1);
          qolChange = isNat20 ? 20 : 14;
          outcomeDesc = `อบรมวิชาชีพสำเร็จเลื่อนเป็น Skill Lv.${player.skillLevel}! ค่าจ้างในอนาคตเพิ่มขึ้นถาวร`;
        } else {
          qolChange = 4;
          outcomeDesc = `การสอบประเมินยังไม่ผ่านเกณฑ์ ได้รับประสบการณ์ความรู้พื้นฐาน`;
        }
      } else {
        outcomeDesc = `ทุนทรัพย์ไม่พอชำระค่าอบรมทักษะ`;
      }
    } else {
      goldChange = isNat20 ? 6000 : (isSuccess ? 4000 : 1500);
      qolChange = isSuccess ? 8 : 2;
      outcomeDesc = isSuccess ? `ทำงานได้ผลงานดี ได้ค่าจ้างและเบี้ยขยัน +${goldChange} บาท` : `งานหนักแต่ได้ผลตอบแทนตามปกติ`;
    }
  } else if (role === 'vulnerable_group') {
    if (actionCategory === 'welfare_direct' || actionCategory === 'digital_help') {
      const grant = isNat20 ? 1500 : 1000;
      goldChange = grant;
      qolChange = isNat20 ? 18 : 12;
      outcomeDesc = `เงินโอนสวัสดิการแห่งรัฐเข้าบัญชีตรง +${grant.toLocaleString()} บาท ช่วยบรรเทาค่าครองชีพ!`;
    } else {
      const relief = isSuccess ? 1200 : 800;
      goldChange = relief;
      qolChange = isSuccess ? 10 : 5;
      outcomeDesc = `รูดบัตรสวัสดิการแห่งรัฐรับข้าวสารอาหารแห้งมูลค่า ${relief} บาท`;
    }
  }

  // Apply delta to player
  player.cash += goldChange;
  player.qol = Math.max(10, Math.min(100, player.qol + qolChange));
  if (player.cash < 0) {
    player.debt += Math.abs(player.cash);
    player.cash = 0;
    player.qol = Math.max(5, player.qol - 8);
  }

  // Update room macro stats
  room.macroStats.totalVelocity += velocityImpact;
  room.macroStats.totalVatCollected += vatImpact;
  room.macroStats.totalCoPaySubsidies += coPayImpact;
  room.macroStats.gdp += Math.round(velocityImpact * 1.4);

  // Record D20 log
  const logEntry = {
    playerId: player.id,
    playerName: player.name,
    roleTitle: player.title,
    className: player.className,
    avatar: player.avatar,
    d20,
    modifier,
    totalScore,
    dc,
    isNat20,
    isNat1,
    isSuccess,
    actionName,
    outcomeTitle,
    outcomeDesc,
    timestamp: new Date().toLocaleTimeString('th-TH')
  };

  player.lastD20Roll = logEntry;
  player.lastActionDesc = `${actionName} → ${outcomeTitle}`;
  player.hasRolledThisRound = true;

  if (!room.d20Logs) room.d20Logs = [];
  room.d20Logs.push(logEntry);
  if (room.d20Logs.length > 20) room.d20Logs.shift();

  return logEntry;
}

// Complete settlement for the entire district round
function processDistrictSettlement(room) {
  const roundInfo = room.currentRoundData || ROUNDS_DATA[room.round - 1];
  const logs = [];

  // Fixed Income & Expense adjusted by Energy Inflation
  room.players.forEach(player => {
    const baseInc = (player.baseIncome || 10000) * (1 + (player.skillLevel - 1) * 0.25);
    const expense = (player.fixedExpense || 5000) * roundInfo.energyCostIndex;

    player.cash += (baseInc - expense);
    if (player.cash < 0) {
      player.debt += Math.abs(player.cash);
      player.cash = 0;
      player.qol = Math.max(5, player.qol - 8);
      logs.push(`⚠️ ${player.name} สภาพคล่องติดลบ ก่อหนี้เพิ่ม ${player.debt.toLocaleString()} บาท`);
    } else {
      player.qol = Math.min(100, player.qol + 2);
    }
  });

  // Debt-to-GDP adjustment
  room.macroStats.debtToGdp += roundInfo.publicDebtChange;
  if (room.macroStats.totalVatCollected > 5000) {
    room.macroStats.debtToGdp = Math.max(55.0, room.macroStats.debtToGdp - 0.4);
  }

  // Recalculate Lorenz & Gini
  const eco = calculateLorenzAndGini(room.players);
  room.macroStats.gini = eco.gini;

  // Crisis check
  let crisis = null;
  if (room.macroStats.debtToGdp >= 70.0) {
    crisis = '🚨 วิกฤตวินัยการคลัง: หนี้สาธารณะทะลุเพดาน 70% ต่อ GDP!';
  } else if (room.macroStats.gini >= 0.82) {
    crisis = '⚠️ วิกฤตความเหลื่อมล้ำ: ค่า Gini พุ่งแตะ 0.82 สังคมแตกแยก!';
  }
  room.macroStats.crisisAlert = crisis;

  return { eco, logs, crisis };
}

// Role actions pool for Pure Random Bot decisions
const ROLE_ACTIONS_POOL = {
  capitalist: ['expand_chain', 'etax_supply', 'investment'],
  sme_vendor: ['copay_boost', 'bank_loan', 'restock'],
  general_citizen: ['copay_spend_sme', 'copay_spend_mall', 'upgrade_skill', 'work'],
  vulnerable_group: ['claim_welfare', 'buy_essentials', 'digital_help']
};

// Helper: Pick a purely random action for a given role
function getRandomActionForRole(roleType) {
  const pool = ROLE_ACTIONS_POOL[roleType] || ['default'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Auto-roll D20 for AI bots (100% Pure Random Actions & Simulated D20)
function autoRollDistrictBots(room) {
  const currentRoundActions = (room.roundActions && room.roundActions[room.round]) 
    || (THEMATIC_ROUND_ACTIONS && THEMATIC_ROUND_ACTIONS[room.round]);

  room.players.forEach(p => {
    if (!p.isBot) return;
    if (p.hasRolledThisRound) return; // Prevent multiple rolls in same round

    let botAction = null;
    if (currentRoundActions && currentRoundActions[p.roleType] && currentRoundActions[p.roleType].length > 0) {
      const pool = currentRoundActions[p.roleType];
      botAction = pool[Math.floor(Math.random() * pool.length)].id;
    } else {
      botAction = getRandomActionForRole(p.roleType);
    }

    const simulatedD20 = Math.floor(Math.random() * 20) + 1;
    resolvePlayerDndRoll(room, p, botAction, simulatedD20);
  });
}

// Auto-Bot Takeover: Take over for human players who disconnected or timed out
function autoTakeoverInactivePlayers(room, forceAllInactive = false) {
  const currentRoundActions = (room.roundActions && room.roundActions[room.round]) 
    || (THEMATIC_ROUND_ACTIONS && THEMATIC_ROUND_ACTIONS[room.round]);

  const takenOver = [];

  room.players.forEach(p => {
    if (p.isBot) return;
    if (p.hasRolledThisRound) return; // Already completed action this round

    // Take over if player is marked disconnected OR if forced (e.g. before round advance)
    if (p.isDisconnected || forceAllInactive) {
      let chosenActionId = null;
      if (currentRoundActions && currentRoundActions[p.roleType] && currentRoundActions[p.roleType].length > 0) {
        const pool = currentRoundActions[p.roleType];
        chosenActionId = pool[Math.floor(Math.random() * pool.length)].id;
      } else {
        chosenActionId = getRandomActionForRole(p.roleType);
      }

      const simulatedD20 = Math.floor(Math.random() * 20) + 1;
      const rollResult = resolvePlayerDndRoll(room, p, chosenActionId, simulatedD20);
      rollResult.outcomeDesc = `[บอท 🤖 เล่นแทน] ${rollResult.outcomeDesc}`;
      p.lastActionDesc = `🤖 บอทช่วยเล่นแทน: ${rollResult.actionName}`;
      takenOver.push({ player: p, rollResult });
      console.log(`[Auto-Bot Takeover] Bot rolled for ${p.name} (${p.className}) in ${room.districtName}: ${rollResult.actionName} (D20: ${simulatedD20})`);
    }
  });

  return takenOver;
}

module.exports = {
  resolvePlayerDndRoll,
  processDistrictSettlement,
  autoRollDistrictBots,
  autoTakeoverInactivePlayers,
  getRandomActionForRole
};
