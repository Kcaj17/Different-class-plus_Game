/* =========================================================
   playerView.js — D&D Economic Chronicles: Mobile Player View
   Stage-by-Stage Stepper, Character Reveal, Tactile D20,
   Floating Numbers, Screen Shake, & AI GM Typewriter
   ========================================================= */

import { state, socket } from '../state.js';
import { playSound } from '../ui/audio.js';
import { showToast } from '../ui/toast.js';

let selectedActionId = null;
let selectedActionName = 'กลยุทธ์ทั่วไป';
let isRolling = false;
let currentStage = 1;
let diceRollInterval = null;
let rollStartTime = 0;

// Global Stage Switcher for Stepper Buttons
window.goToPlayerStage = function(stageNum) {
  currentStage = stageNum;
  playSound('click');

  const stage1 = document.getElementById('stage-encounter');
  const stage2 = document.getElementById('stage-strategy');
  const stage3 = document.getElementById('stage-dice');

  const pill1 = document.getElementById('step-pill-1');
  const pill2 = document.getElementById('step-pill-2');
  const pill3 = document.getElementById('step-pill-3');

  if (stage1) stage1.className = `rpg-stage ${stageNum === 1 ? 'active-stage' : 'hidden-stage'}`;
  if (stage2) stage2.className = `rpg-stage ${stageNum === 2 ? 'active-stage' : 'hidden-stage'}`;
  if (stage3) stage3.className = `rpg-stage ${stageNum === 3 ? 'active-stage' : 'hidden-stage'}`;

  if (pill1) pill1.className = `stage-step-pill ${stageNum === 1 ? 'active' : (stageNum > 1 ? 'completed' : '')}`;
  if (pill2) pill2.className = `stage-step-pill ${stageNum === 2 ? 'active' : (stageNum > 2 ? 'completed' : '')}`;
  if (pill3) pill3.className = `stage-step-pill ${stageNum === 3 ? 'active' : ''}`;

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Dramatic Character Reveal (Veil of Ignorance Gacha Card Flip)
export function showCharacterReveal(player, room, onConfirmCallback) {
  const modal = document.getElementById('modal-character-reveal');
  const flipCard = document.getElementById('veil-flip-card');
  if (!modal || !flipCard) {
    if (onConfirmCallback) onConfirmCallback();
    return;
  }

  // Populate card details
  const avatar = document.getElementById('reveal-avatar');
  const title = document.getElementById('reveal-title');
  const district = document.getElementById('reveal-district');
  const perk = document.getElementById('reveal-perk');
  const cap = document.getElementById('reveal-cap');
  const lab = document.getElementById('reveal-lab');
  const inf = document.getElementById('reveal-inf');
  const dig = document.getElementById('reveal-dig');
  const gold = document.getElementById('reveal-gold');
  const hp = document.getElementById('reveal-hp');

  const stats = player.dndStats || { cap: 10, lab: 10, inf: 10, dig: 10 };
  if (avatar) avatar.textContent = player.avatar || '👤';
  if (title) title.textContent = player.className || player.title;
  if (district) district.textContent = room ? room.districtName : 'เขตเศรษฐกิจ';
  if (perk) perk.textContent = player.classPerk || player.description;
  if (cap) cap.textContent = stats.cap;
  if (lab) lab.textContent = stats.lab;
  if (inf) inf.textContent = stats.inf;
  if (dig) dig.textContent = stats.dig;
  if (gold) gold.textContent = `${Math.round(player.cash).toLocaleString()} บ.`;
  if (hp) hp.textContent = `${player.qol || 50} HP`;

  // Show modal and start with front rune face
  flipCard.classList.remove('flipped');
  modal.classList.remove('hidden');
  playSound('crisis');

  // Trigger flip animation after dramatic pause (600ms)
  setTimeout(() => {
    flipCard.classList.add('flipped');
    playSound('fanfare');
    triggerScreenShake('gold');
  }, 600);

  // Bind Confirm Button
  const btnConfirm = document.getElementById('btn-start-adventure');
  if (btnConfirm) {
    btnConfirm.onclick = () => {
      playSound('click');
      modal.classList.add('hidden');
      if (onConfirmCallback) onConfirmCallback();
    };
  }
}

// Render Main Player Screen
export function renderPlayerView(player, room, roundData) {
  if (!player || !room) return;

  // 1. Character Identity & D&D Class in Top HUD
  const plAvatar = document.getElementById('pl-avatar');
  const plName = document.getElementById('pl-name');
  const plClassBadge = document.getElementById('pl-class-badge');
  const plPerk = document.getElementById('pl-perk-text');
  const districtBadge = document.getElementById('pl-district-badge');

  if (plAvatar) plAvatar.textContent = player.avatar || '👤';
  if (plName) plName.textContent = player.name;
  if (plClassBadge) plClassBadge.textContent = player.className || player.title;
  if (plPerk) plPerk.textContent = player.classPerk || player.description;
  if (districtBadge) districtBadge.textContent = room.districtName || 'เขตเศรษฐกิจ';

  // 2. D&D Attributes (CAP, LAB, INF, DIG)
  const stats = player.dndStats || { cap: 10, lab: 10, inf: 10, dig: 10 };
  renderAttribute('attr-cap', stats.cap, 'ทุน & ทรัพย์สิน');
  renderAttribute('attr-lab', stats.lab, 'แรงงาน & ทักษะ');
  renderAttribute('attr-inf', stats.inf, 'อิทธิพล & เครือข่าย');
  renderAttribute('attr-dig', stats.dig, 'รอยเท้าดิจิทัล');

  // 3. Vitals: HP / QoL, Gold, Debt in Top HUD
  const plHpBar = document.getElementById('pl-hp-bar');
  const plHpText = document.getElementById('pl-hp-text');
  const plGold = document.getElementById('pl-gold');
  const plDebt = document.getElementById('pl-debt');

  const hp = player.qol || 50;
  if (plHpBar) {
    plHpBar.style.width = `${hp}%`;
    plHpBar.style.backgroundColor = hp > 50 ? '#10b981' : (hp > 25 ? '#f59e0b' : '#ef4444');
  }
  if (plHpText) plHpText.textContent = `${hp}/100`;
  if (plGold) plGold.textContent = `${Math.round(player.cash).toLocaleString()} บ.`;
  if (plDebt) plDebt.textContent = `${Math.round(player.debt).toLocaleString()} บ.`;

  // 4. Chapter & Lore (Stage 1)
  const chapter = roundData || {};
  const roundTitle = document.getElementById('pl-round-title');
  const chapterName = document.getElementById('pl-chapter-name');
  const chapterLore = document.getElementById('pl-chapter-lore');
  const chapterNews = document.getElementById('pl-chapter-news');

  if (roundTitle) roundTitle.textContent = `ไตรมาสที่ ${room.round} / ${room.maxRounds}`;
  if (chapterName) chapterName.textContent = chapter.chapterName || `ไตรมาสที่ ${room.round}`;
  if (chapterLore) chapterLore.textContent = chapter.lore || chapter.description || '';
  if (chapterNews) chapterNews.textContent = `📢 ${chapter.newsAlert || ''}`;

  // 5. Render Class Action Choices (Stage 2)
  renderClassActionChoices(player, room, chapter);

  // 6. Restore AI Lore if any
  if (player.lastAiLore) {
    renderAiGmLoreBox(player.lastAiLore);
  }

  // 7. Sync roll state for this round
  const btnRoll = document.getElementById('btn-roll-d20');
  const preRollBox = document.getElementById('stage3-pre-roll-actions');
  const postRollBox = document.getElementById('stage3-post-roll-box');

  if (player.hasRolledThisRound) {
    if (btnRoll) {
      btnRoll.disabled = true;
      btnRoll.innerHTML = `<span>✅ ดำเนินการในไตรมาสนี้แล้ว</span>`;
    }
    if (preRollBox) preRollBox.classList.add('hidden');
    if (postRollBox) postRollBox.classList.remove('hidden');
  } else {
    if (btnRoll) {
      btnRoll.disabled = false;
      btnRoll.innerHTML = `<span>🎲 ทอยเต๋า D20 ตัดสินชะตา</span>`;
    }
    if (preRollBox) preRollBox.classList.remove('hidden');
    if (postRollBox) postRollBox.classList.add('hidden');
  }

  // Setup Stepper Navigation Buttons
  setupStageNavigation();
}

// Helper: Render D&D Attribute with Modifier
function renderAttribute(elementId, value, label) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const mod = Math.floor((value - 10) / 2);
  const sign = mod >= 0 ? `+${mod}` : `${mod}`;
  el.innerHTML = `
    <span class="attr-val">${value}</span>
    <span class="attr-mod">${sign}</span>
    <small class="attr-label">${label}</small>
  `;
}

// Render Actions based on Role & Chapter
function renderClassActionChoices(player, room, chapter) {
  const container = document.getElementById('pl-action-choices-container');
  if (!container) return;

  const role = player.roleType;
  let actions = [];

  if (role === 'capitalist') {
    actions = [
      {
        id: 'expand_chain',
        icon: '🏗️',
        name: 'ขยายสาขาห้างค้าปลีก & ระบบดิจิทัล',
        desc: 'ใช้ทุน 40,000 บาท ขยายสาขา เพิ่มรายได้ประจำถาวร +12,000 บ./รอบ (DC 12: ตรวจสอบ CAP)',
        dc: 12,
        statKey: 'CAP'
      },
      {
        id: 'etax_supply',
        icon: '🧾',
        name: 'ดึงร้านค้าเข้าห่วงโซ่ e-Tax Invoice',
        desc: 'ลงทุนระบบซัพพลายเออร์ดิจิทัล ลดหย่อนภาษี และรับเงินปันผลจากยอดขายร้านค้า (DC 10: ตรวจสอบ DIG)',
        dc: 10,
        statKey: 'DIG'
      },
      {
        id: 'investment',
        icon: '💼',
        name: 'ถือครองพันธบัตรและสินทรัพย์สภาพคล่อง',
        desc: 'รับดอกเบี้ยปลอดภัย 5% และรักษาเกราะป้องกันวิกฤตเงินเฟ้อ (DC 8: ตรวจสอบ INF)',
        dc: 8,
        statKey: 'INF'
      }
    ];
  } else if (role === 'sme_vendor') {
    actions = [
      {
        id: 'copay_boost',
        icon: '🛍️',
        name: 'จัดโปรโมชัน 60/40 ดึงดูดลูกค้าชุมชน',
        desc: 'เข้าร่วมโครงการไทยช่วยไทย พลัส 60/40 รับเงินอุดหนุนรัฐ ยอดขายพุ่ง 2 เท่า (DC 10: ตรวจสอบ LAB)',
        dc: 10,
        statKey: 'LAB'
      },
      {
        id: 'bank_loan',
        icon: '🏦',
        name: 'ยื่นกู้ Virtual Bank ดอกเบี้ยต่ำขยายร้าน',
        desc: 'ใช้รอยเท้าดิจิทัลกู้เงิน 30,000 บ. ดอกเบี้ย 3% มาสต็อกสินค้ากำไรสูง (DC 11: ตรวจสอบ DIG)',
        dc: 11,
        statKey: 'DIG'
      },
      {
        id: 'restock',
        icon: '📦',
        name: 'ซื้อสินค้าสต็อกราคาส่ง ตรึงราคาขาย',
        desc: 'บริหารจัดการสต็อก ป้องกันความเสี่ยงเงินเฟ้อและต้นทุนพลังงาน (DC 9: ตรวจสอบ CAP)',
        dc: 9,
        statKey: 'CAP'
      }
    ];
  } else if (role === 'general_citizen') {
    actions = [
      {
        id: 'copay_spend_sme',
        icon: '🛒',
        name: 'ใช้สิทธิ์ 60/40 ซื้อของร้านค้าชุมชน',
        desc: 'จ่ายเอง 40% รัฐออกให้ 60% ประหยัดเงิน และได้ของมูลค่า 3,000 บาท! (DC 8: ตรวจสอบ INF)',
        dc: 8,
        statKey: 'INF'
      },
      {
        id: 'upgrade_skill',
        icon: '📚',
        name: 'ลงทะเบียน Upskill สถาบันพัฒนาทักษะ',
        desc: 'ใช้เงิน 4,000 บาท เข้าคอร์สอัปเกรดวิชาชีพ เลื่อนขั้นเงินเดือนถาวร +25% (DC 12: ตรวจสอบ LAB)',
        dc: 12,
        statKey: 'LAB'
      },
      {
        id: 'copay_spend_mall',
        icon: '🏢',
        name: 'ซื้อสินค้าอุปโภคบริโภคในห้างค้าปลีก',
        desc: 'ช้อปปิ้งห้างใหญ่ สินค้าครบครัน แต่เงินไหลเข้ามหาเศรษฐีเจ้าของทุน (DC 7: ตรวจสอบ CAP)',
        dc: 7,
        statKey: 'CAP'
      }
    ];
  } else {
    // vulnerable_group
    actions = [
      {
        id: 'claim_welfare',
        icon: '💳',
        name: 'รูดบัตรสวัสดิการแห่งรัฐซื้อสินค้าจำเป็น',
        desc: 'รับสิทธิ์สวัสดิการข้าวสารอาหารแห้งมูลค่า 1,000 บาทฟรี! เพิ่มพลังชีวิต QoL (DC 6: ตรวจสอบ INF)',
        dc: 6,
        statKey: 'INF'
      },
      {
        id: 'buy_essentials',
        icon: '🍚',
        name: 'เข้าร่วมกองทุนชุมชนช่วยเหลือน้ำ-ไฟ',
        desc: 'ขอรับการลดหย่อนค่าสาธารณูปโภคบรรเทาพิษเงินเฟ้อ (DC 8: ตรวจสอบ LAB)',
        dc: 8,
        statKey: 'LAB'
      },
      {
        id: 'digital_help',
        icon: '📱',
        name: 'ขอความช่วยเหลือชุมชนก้าวข้าม Digital Divide',
        desc: 'ขอให้อาสาสมัครลงทะเบียนยืนยันตัวตนดิจิทัลเพื่อรับสิทธิ์เงินอุดหนุนรัฐ (DC 9: ตรวจสอบ DIG)',
        dc: 9,
        statKey: 'DIG'
      }
    ];
  }

  // Default selection
  if (!selectedActionId && actions.length > 0) {
    selectedActionId = actions[0].id;
    selectedActionName = actions[0].name;
  }

  container.innerHTML = actions.map(act => {
    const isSelected = act.id === selectedActionId;
    return `
      <div class="action-card glass-card ${isSelected ? 'selected-action' : ''}" data-action-id="${act.id}" data-action-name="${act.name}">
        <div class="action-top">
          <span class="action-icon">${act.icon}</span>
          <span class="dc-badge">DC ${act.dc} (${act.statKey})</span>
        </div>
        <strong class="action-title">${act.name}</strong>
        <p class="action-desc">${act.desc}</p>
        <div class="action-select-indicator">
          <span>${isSelected ? '✅ เลือกกลยุทธ์นี้แล้ว' : 'แตะเพื่อเลือก'}</span>
        </div>
      </div>
    `;
  }).join('');

  // Update selected action pill in Stage 3
  updateSelectedActionPill();

  // Attach card click handlers
  container.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', () => {
      playSound('click');
      container.querySelectorAll('.action-card').forEach(c => c.classList.remove('selected-action'));
      card.classList.add('selected-action');
      selectedActionId = card.getAttribute('data-action-id');
      selectedActionName = card.getAttribute('data-action-name');
      
      container.querySelectorAll('.action-select-indicator span').forEach(s => s.textContent = 'แตะเพื่อเลือก');
      const ind = card.querySelector('.action-select-indicator span');
      if (ind) ind.textContent = '✅ เลือกกลยุทธ์นี้แล้ว';

      updateSelectedActionPill();

      // Mobile UX: Auto-scroll smoothly to the "Go to Dice" button and add pulse effect
      const btnGoToDice = document.getElementById('btn-go-to-dice');
      if (btnGoToDice) {
        btnGoToDice.classList.add('btn-glow');
        setTimeout(() => {
          btnGoToDice.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
    });
  });
}

function updateSelectedActionPill() {
  const pill = document.getElementById('dice-selected-action-pill');
  if (pill) {
    pill.textContent = `การกระทำที่เลือก: ${selectedActionName}`;
    pill.title = selectedActionName;
  }
}

// Setup Stepper Stage Navigation Buttons
function setupStageNavigation() {
  const btnGoToStrategy = document.getElementById('btn-go-to-strategy');
  if (btnGoToStrategy) {
    btnGoToStrategy.onclick = () => window.goToPlayerStage(2);
  }

  const btnBackToEncounter = document.getElementById('btn-back-to-encounter');
  if (btnBackToEncounter) {
    btnBackToEncounter.onclick = () => window.goToPlayerStage(1);
  }

  const btnGoToDice = document.getElementById('btn-go-to-dice');
  if (btnGoToDice) {
    btnGoToDice.onclick = () => window.goToPlayerStage(3);
  }

  const btnBackToStrategy = document.getElementById('btn-back-to-strategy');
  if (btnBackToStrategy) {
    btnBackToStrategy.onclick = () => window.goToPlayerStage(2);
  }

  // D20 Interactive Dice Click Handler
  const diceCube = document.getElementById('d20-dice-cube');
  if (diceCube && !diceCube.dataset.hasListener) {
    diceCube.dataset.hasListener = 'true';
    diceCube.addEventListener('click', () => {
      triggerPlayerD20Roll();
    });
  }

  // Roll Button Click Handler
  const btnRoll = document.getElementById('btn-roll-d20');
  if (btnRoll && !btnRoll.dataset.hasListener) {
    btnRoll.dataset.hasListener = 'true';
    btnRoll.addEventListener('click', () => {
      triggerPlayerD20Roll();
    });
  }

  // Party Roster Modal Trigger
  const btnParty = document.getElementById('btn-open-party-roster');
  if (btnParty && !btnParty.dataset.hasListener) {
    btnParty.dataset.hasListener = 'true';
    btnParty.addEventListener('click', () => {
      playSound('click');
      openPartyRosterModal();
    });
  }
}

// Trigger D20 Roll with Audio & Realistic Slot Machine Shuffling
export function triggerPlayerD20Roll() {
  if (isRolling) return;
  if (!selectedActionId) {
    showToast('กรุณาเลือก 1 กลยุทธ์ในขั้นที่ 2 ก่อนทอยเต๋า', 'warning');
    window.goToPlayerStage(2);
    return;
  }
  isRolling = true;
  rollStartTime = Date.now();

  playSound('dice');

  const btnRoll = document.getElementById('btn-roll-d20');
  const diceElement = document.getElementById('d20-dice-cube');
  const resultBanner = document.getElementById('d20-result-banner');
  const numEl = document.getElementById('d20-display-number');

  if (btnRoll) {
    btnRoll.disabled = true;
    btnRoll.innerHTML = `<span>🎲 ลูกเต๋ากำลังหมุน...</span>`;
  }
  if (diceElement) {
    diceElement.classList.add('rolling');
  }
  if (resultBanner) {
    resultBanner.classList.add('hidden');
  }

  // Slot Machine effect: fast random numbers between 1-20
  if (diceRollInterval) clearInterval(diceRollInterval);
  diceRollInterval = setInterval(() => {
    if (numEl) {
      numEl.textContent = Math.floor(Math.random() * 20) + 1;
    }
  }, 60);

  // Send to Server immediately (Server is the authentic dice authority)
  if (socket) {
    socket.emit('player:roll_d20', {
      actionId: selectedActionId
    });
  }
}

// Display Roll Result received from server
export function showRollResolution(rollResult, myPlayer) {
  // Ensure minimum animation time of 750ms so player enjoys the roll
  const elapsed = Date.now() - rollStartTime;
  const remainingDelay = Math.max(0, 750 - elapsed);

  setTimeout(() => {
    // 1. Stop rolling slot interval
    if (diceRollInterval) {
      clearInterval(diceRollInterval);
      diceRollInterval = null;
    }

    const diceElement = document.getElementById('d20-dice-cube');
    if (diceElement) {
      diceElement.classList.remove('rolling');
    }

    // 2. Land directly on authentic Server D20 roll (Zero morphing)
    const numEl = document.getElementById('d20-display-number');
    if (numEl && rollResult.d20) {
      numEl.textContent = rollResult.d20;
    }

    const btnRoll = document.getElementById('btn-roll-d20');
    if (btnRoll) {
      btnRoll.disabled = true;
      btnRoll.innerHTML = `<span>✅ ดำเนินการในไตรมาสนี้แล้ว</span>`;
    }

    // 3. Switch from action button to quarter waiting box
    const preRollBox = document.getElementById('stage3-pre-roll-actions');
    const postRollBox = document.getElementById('stage3-post-roll-box');
    if (preRollBox) preRollBox.classList.add('hidden');
    if (postRollBox) postRollBox.classList.remove('hidden');

    isRolling = false;

    const banner = document.getElementById('d20-result-banner');
    if (!banner) return;

    const isNat20 = rollResult.isNat20;
    const isNat1 = rollResult.isNat1;
    const isSuccess = rollResult.isSuccess;

    let bannerClass = 'banner-success';
    if (isNat20) {
      bannerClass = 'banner-nat20';
      playSound('fanfare');
      triggerScreenShake('gold');
      spawnFloatingNumber('🌟 NATURAL 20!', 'gold');
    } else if (isNat1) {
      bannerClass = 'banner-nat1';
      playSound('crisis');
      triggerScreenShake('red');
      spawnFloatingNumber('💀 CRITICAL FAILURE!', 'hp-loss');
    } else if (isSuccess) {
      bannerClass = 'banner-success';
      playSound('cash');
      spawnFloatingNumber('✅ สำเร็จ!', 'gold');
    } else {
      bannerClass = 'banner-fail';
      playSound('click');
    }

    banner.className = `d20-result-banner ${bannerClass}`;
    banner.innerHTML = `
      <div class="result-title">${rollResult.outcomeTitle}</div>
      <div class="result-calc">
        ลูกเต๋า D20: <strong>${rollResult.d20}</strong> 
        + Stat Mod: <strong>${rollResult.modifier >= 0 ? `+${rollResult.modifier}` : rollResult.modifier}</strong> 
        = คะแนนรวม <strong>${rollResult.totalScore}</strong> (เป้าหมาย DC ${rollResult.dc})
      </div>
      <div class="result-desc">${rollResult.outcomeDesc}</div>
    `;
    banner.classList.remove('hidden');

    // Update vitals in HUD
    if (myPlayer) {
      const plHpBar = document.getElementById('pl-hp-bar');
      const plHpText = document.getElementById('pl-hp-text');
      const plGold = document.getElementById('pl-gold');
      const plDebt = document.getElementById('pl-debt');

      const hp = myPlayer.qol || 50;
      if (plHpBar) {
        plHpBar.style.width = `${hp}%`;
        plHpBar.style.backgroundColor = hp > 50 ? '#10b981' : (hp > 25 ? '#f59e0b' : '#ef4444');
      }
      if (plHpText) plHpText.textContent = `${hp}/100`;
      if (plGold) plGold.textContent = `${Math.round(myPlayer.cash).toLocaleString()} บ.`;
      if (plDebt) plDebt.textContent = `${Math.round(myPlayer.debt).toLocaleString()} บ.`;
    }
  }, remainingDelay);
}

// Handle roll error (e.g. rate limit, duplicate roll)
export function handleRollError() {
  if (diceRollInterval) {
    clearInterval(diceRollInterval);
    diceRollInterval = null;
  }
  const diceElement = document.getElementById('d20-dice-cube');
  if (diceElement) diceElement.classList.remove('rolling');
  isRolling = false;

  const btnRoll = document.getElementById('btn-roll-d20');
  if (btnRoll) {
    btnRoll.disabled = true;
    btnRoll.innerHTML = `<span>✅ ดำเนินการในไตรมาสนี้แล้ว</span>`;
  }

  const preRollBox = document.getElementById('stage3-pre-roll-actions');
  const postRollBox = document.getElementById('stage3-post-roll-box');
  if (preRollBox) preRollBox.classList.add('hidden');
  if (postRollBox) postRollBox.classList.remove('hidden');
}

// Reset mobile player view when advancing to a new quarter
export function onNewQuarterStarted(newRound) {
  // 1. Navigate back to Stage 1 (Analyze encounter lore)
  if (window.goToPlayerStage) {
    window.goToPlayerStage(1);
  }

  // 2. Hide previous round result banner & AI lore box
  const resultBanner = document.getElementById('d20-result-banner');
  if (resultBanner) {
    resultBanner.classList.add('hidden');
    resultBanner.innerHTML = '';
  }
  const aiGmBox = document.getElementById('ai-gm-lore-box');
  if (aiGmBox) {
    aiGmBox.classList.add('hidden');
  }

  // 3. Reset dice cube display to 20
  const numEl = document.getElementById('d20-display-number');
  if (numEl) numEl.textContent = '20';

  // 4. Reset roll button & Stage 3 action bars
  const btnRoll = document.getElementById('btn-roll-d20');
  if (btnRoll) {
    btnRoll.disabled = false;
    btnRoll.innerHTML = `<span>🎲 ทอยเต๋า D20 ตัดสินชะตา</span>`;
  }
  const preRollBox = document.getElementById('stage3-pre-roll-actions');
  const postRollBox = document.getElementById('stage3-post-roll-box');
  if (preRollBox) preRollBox.classList.remove('hidden');
  if (postRollBox) postRollBox.classList.add('hidden');

  // 5. Reset selected action so player chooses fresh card
  selectedActionId = null;
  const pill = document.getElementById('dice-selected-action-pill');
  if (pill) pill.textContent = 'การกระทำที่เลือก: -';
}
window.onNewQuarterStarted = onNewQuarterStarted;

// Render AI Dungeon Master Lore Box with Typewriter Effect
export function renderAiGmLoreBox(loreText) {
  const box = document.getElementById('ai-gm-lore-box');
  const textEl = document.getElementById('ai-gm-lore-text');
  if (!box || !textEl || !loreText) return;

  box.classList.remove('hidden');
  typewriterEffect(textEl, loreText, 25);
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Typewriter Text Animation
function typewriterEffect(element, text, speed = 25) {
  element.textContent = '';
  let i = 0;
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}

// Spawn Floating Number / Text Effect
export function spawnFloatingNumber(text, type = 'gold') {
  const container = document.getElementById('floating-numbers-container');
  if (!container) return;

  const numEl = document.createElement('div');
  numEl.className = `floating-combat-num float-${type}`;
  numEl.textContent = text;
  numEl.style.left = '50%';
  numEl.style.top = '45%';

  container.appendChild(numEl);

  setTimeout(() => {
    if (numEl.parentNode) {
      numEl.parentNode.removeChild(numEl);
    }
  }, 1600);
}

// Screen Shake Effect
export function triggerScreenShake(type = 'gold') {
  const app = document.getElementById('app-container');
  if (!app) return;

  const shakeClass = type === 'red' ? 'screen-shake-red' : 'screen-shake-gold';
  app.classList.remove('screen-shake-gold', 'screen-shake-red');
  void app.offsetWidth; // trigger reflow
  app.classList.add(shakeClass);

  setTimeout(() => {
    app.classList.remove(shakeClass);
  }, 600);
}

// Open Party Roster Modal (10 Adventurers in this District)
export function openPartyRosterModal() {
  const modal = document.getElementById('modal-party-roster');
  const room = state.currentRoom;
  if (!modal || !room) {
    showToast('กำลังโหลดข้อมูลเพื่อนร่วมเขต...', 'info');
    return;
  }

  const listContainer = document.getElementById('party-roster-list');
  const districtNameEl = document.getElementById('party-district-name');

  const totalPlayers = room.players ? room.players.length : 0;
  const rolledCount = room.players ? room.players.filter(p => p.hasRolledThisRound).length : 0;

  if (districtNameEl) {
    districtNameEl.innerHTML = `<span>${room.districtName} (${totalPlayers}/10 คน)</span> • <span style="color: #38bdf8; font-weight: 500;">ทอยแล้ว ${rolledCount}/${totalPlayers} คน</span>`;
  }

  if (listContainer && room.players) {
    listContainer.innerHTML = room.players.map((p, idx) => {
      const isMe = state.myPlayer && p.id === state.myPlayer.id;

      // Status badge: rolled vs planning
      const statusBadge = p.hasRolledThisRound
        ? `<span style="display: inline-flex; align-items: center; font-size: 0.7rem; padding: 1px 7px; border-radius: 12px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-weight: 500;">✅ ทอยแล้ว</span>`
        : `<span style="display: inline-flex; align-items: center; font-size: 0.7rem; padding: 1px 7px; border-radius: 12px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); font-weight: 500;">⏳ กำลังวางแผน</span>`;

      // Role tag: Bot or Me
      const roleBadge = p.isBot
        ? `<span style="font-size: 0.68rem; padding: 1px 5px; border-radius: 6px; background: rgba(148, 163, 184, 0.2); color: #94a3b8; margin-left: 4px;">🤖 บอท</span>`
        : (isMe ? `<span style="font-size: 0.68rem; padding: 1px 5px; border-radius: 6px; background: rgba(56, 189, 248, 0.25); color: #38bdf8; font-weight: bold; margin-left: 4px;">(คุณ)</span>` : '');

      return `
        <div class="party-player-item ${isMe ? 'party-me-highlight' : ''}" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.35); padding: 8px 12px; border-radius: 8px; margin-bottom: 7px; border-left: 3px solid ${isMe ? '#10b981' : (p.hasRolledThisRound ? '#34d399' : '#f59e0b')}; border-top: 1px solid rgba(255,255,255,0.04);">
          <div style="display: flex; align-items: center; gap: 9px;">
            <span style="font-size: 1.3rem;">${p.avatar || '👤'}</span>
            <div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <strong style="color: #fff; font-size: 0.88rem;">${idx + 1}. ${p.name}</strong>
                ${roleBadge}
                ${statusBadge}
              </div>
              <small style="display: block; color: #94a3b8; font-size: 0.75rem; margin-top: 2px;">${p.className || p.title}</small>
            </div>
          </div>
          <div style="text-align: right; font-family: var(--font-mono); font-size: 0.78rem;">
            <div style="color: #f59e0b; font-weight: 600;">💰 ${Math.round(p.cash).toLocaleString()} บ.</div>
            <small style="color: ${p.qol > 50 ? '#10b981' : '#f87171'};">❤️ ${p.qol || 50} HP</small>
          </div>
        </div>
      `;
    }).join('');
  }

  modal.classList.remove('hidden');

  // Close button & backdrop click to close
  const btnClose = document.getElementById('btn-close-party-modal');
  if (btnClose) {
    btnClose.onclick = () => modal.classList.add('hidden');
  }
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  };
}

// Export alias for backwards compatibility
export { triggerPlayerD20Roll as triggerD20Roll };

