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
  if (hp) hp.textContent = `${player.qol || 50}% สุขภาวะ`;

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
export function renderPlayerView(player, room, roundData, roundActions) {
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

  // 0. District Waiting Hall vs Active Playing Stages
  const waitingCard = document.getElementById('district-waiting-room');
  const stepperBar = document.querySelector('.stage-stepper-bar');
  const stage1 = document.getElementById('stage-encounter');
  const stage2 = document.getElementById('stage-strategy');
  const stage3 = document.getElementById('stage-dice');

  if (room.status === 'waiting') {
    if (waitingCard) {
      waitingCard.classList.remove('hidden');
      renderWaitingRoom(room, player);
    }
    if (stepperBar) stepperBar.classList.add('hidden');
    if (stage1) stage1.className = 'rpg-stage hidden-stage';
    if (stage2) stage2.className = 'rpg-stage hidden-stage';
    if (stage3) stage3.className = 'rpg-stage hidden-stage';
    return;
  } else {
    if (waitingCard) waitingCard.classList.add('hidden');
    if (stepperBar) stepperBar.classList.remove('hidden');
  }

  // 4. Chapter & Lore (Stage 1)
  const chapter = roundData || {};
  const roundTitle = document.getElementById('pl-round-title');
  const chapterName = document.getElementById('pl-chapter-name');
  const chapterLore = document.getElementById('pl-chapter-lore');
  const chapterNews = document.getElementById('pl-chapter-news');

  if (roundTitle) roundTitle.textContent = `รอบที่ ${room.round} / ${room.maxRounds}`;
  if (chapterName) chapterName.textContent = chapter.chapterName || `รอบที่ ${room.round}`;
  if (chapterLore) chapterLore.textContent = chapter.lore || chapter.description || '';
  if (chapterNews) chapterNews.textContent = `📢 ${chapter.newsAlert || ''}`;

  // 5. Render Class Action Choices (Stage 2)
  renderClassActionChoices(player, room, chapter, roundActions);

  // 6. Restore AI Lore if any (instant render, no typewriter animation)
  if (player.lastAiLore) {
    renderAiGmLoreBox(player.lastAiLore, false);
  }

  // 7. Sync roll state for this round
  const btnRoll = document.getElementById('btn-roll-d20');
  const preRollBox = document.getElementById('stage3-pre-roll-actions');
  const postRollBox = document.getElementById('stage3-post-roll-box');
  const pedestal = document.getElementById('d20-pre-roll-pedestal');
  const diceCube = document.getElementById('d20-dice-cube');
  const diceHint = document.getElementById('d20-dice-hint');

  if (player.hasRolledThisRound) {
    if (btnRoll) {
      btnRoll.disabled = true;
      btnRoll.innerHTML = `<span>✅ ดำเนินการในรอบนี้แล้ว</span>`;
    }
    if (preRollBox) preRollBox.classList.add('hidden');
    if (postRollBox) postRollBox.classList.remove('hidden');
    if (pedestal) pedestal.classList.add('hidden');
    if (diceCube) {
      diceCube.classList.remove('hidden');
      diceCube.classList.remove('rolling');
    }
    if (diceHint) diceHint.classList.add('hidden');
  } else {
    if (btnRoll) {
      btnRoll.disabled = false;
      btnRoll.innerHTML = `<span>🎲 กดทอยลูกเต๋าตัดสินผล ➔</span>`;
    }
    if (preRollBox) preRollBox.classList.remove('hidden');
    if (postRollBox) postRollBox.classList.add('hidden');
    if (pedestal) pedestal.classList.remove('hidden');
    if (diceCube) diceCube.classList.add('hidden');
    if (diceHint) diceHint.classList.add('hidden');
  }

  // Real-time dynamic sync for post-roll waiting box
  updatePostRollWaitingState(room, player);

  // Setup Stepper Navigation Buttons
  setupStageNavigation();
}

// Dynamic Stage 3 Post-Roll Waiting Status (Real-time sync)
export function updatePostRollWaitingState(room, player) {
  const postRollBox = document.getElementById('stage3-post-roll-box');
  if (!postRollBox) return;

  const currentRoom = room || state.currentRoom;
  const currentPlayer = player || state.myPlayer;
  const totalPlayers = currentRoom && currentRoom.players ? currentRoom.players.length : 1;
  const rolledCount = currentRoom && currentRoom.players
    ? currentRoom.players.filter(p => p.hasRolledThisRound).length
    : (currentPlayer && currentPlayer.hasRolledThisRound ? 1 : 0);
  const remaining = Math.max(0, totalPlayers - rolledCount);
  const isAllRolled = totalPlayers > 0 && rolledCount >= totalPlayers;
  const pct = Math.min(100, Math.round((rolledCount / totalPlayers) * 100));

  const iconEl = document.getElementById('post-roll-icon');
  const titleEl = document.getElementById('post-roll-title');
  const hintEl = document.getElementById('player-waiting-hint');
  const progressText = document.getElementById('post-roll-progress-text');
  const progressBar = document.getElementById('post-roll-progress-bar');
  const advanceAction = document.getElementById('post-roll-advance-action');

  if (progressBar) {
    progressBar.style.width = `${pct}%`;
    progressBar.style.background = isAllRolled 
      ? 'linear-gradient(90deg, #10b981, #34d399)' 
      : 'linear-gradient(90deg, #38bdf8, #10b981)';
  }
  if (progressText) {
    progressText.textContent = `ทอยแล้ว ${rolledCount}/${totalPlayers} คน (${pct}%)`;
    progressText.style.color = isAllRolled ? '#34d399' : '#38bdf8';
  }

  if (isAllRolled) {
    if (iconEl) iconEl.textContent = '🎉';
    if (titleEl) {
      titleEl.textContent = `สมาชิกในกลุ่มทอยครบทุกคนแล้ว (${rolledCount}/${totalPlayers} คน)!`;
      titleEl.style.color = '#34d399';
    }
    if (hintEl) {
      hintEl.innerHTML = `
        <span style="color: #34d399; font-weight: 600;">✅ สมาชิกในกลุ่มของคุณดำเนินการครบ 100% แล้ว</span><br>
        <span style="color: #cbd5e1; font-size: 0.85rem; margin-top: 4px; display: inline-block;">
          กำลังรอผู้ดูแลระบบสรุปผลเศรษฐกิจ และเปิดรอบถัดไป... หรือคลิกปุ่มด้านล่างเพื่อไปยังรอบถัดไปได้ทันที
        </span>
      `;
    }
    postRollBox.style.borderColor = 'rgba(16, 185, 129, 0.6)';
    postRollBox.style.background = 'rgba(16, 185, 129, 0.12)';
    postRollBox.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.2)';

    if (advanceAction) {
      advanceAction.classList.remove('hidden');
    }
  } else {
    if (iconEl) iconEl.textContent = '⏳';
    if (titleEl) {
      titleEl.textContent = 'คุณบันทึกการตัดสินใจในรอบนี้เรียบร้อยแล้ว!';
      titleEl.style.color = '#38bdf8';
    }
    if (hintEl) {
      hintEl.textContent = `กำลังรอเพื่อนร่วมกลุ่มอีก ${remaining} คนวางแผนและทอยลูกเต๋า... (ทอยแล้ว ${rolledCount}/${totalPlayers} คน)`;
    }
    postRollBox.style.borderColor = 'rgba(56, 189, 248, 0.35)';
    postRollBox.style.background = 'rgba(56, 189, 248, 0.08)';
    postRollBox.style.boxShadow = 'none';

    if (advanceAction) {
      advanceAction.classList.add('hidden');
    }
  }

  // Check for any unrolled disconnected human players
  const unrolledDisconnected = (currentRoom && currentRoom.players)
    ? currentRoom.players.filter(p => !p.isBot && p.isDisconnected && !p.hasRolledThisRound)
    : [];

  const disconnectedAlert = document.getElementById('post-roll-disconnected-alert');
  const disconnectedMsg = document.getElementById('post-roll-disconnected-msg');
  if (disconnectedAlert) {
    if (unrolledDisconnected.length > 0 && !isAllRolled) {
      disconnectedAlert.classList.remove('hidden');
      if (disconnectedMsg) {
        const names = unrolledDisconnected.map(p => p.name).join(', ');
        disconnectedMsg.innerHTML = `⚠️ มีเพื่อนในกลุ่มขาดการเชื่อมต่อ (${names}) สามารถกดปุ่มเพื่อให้บอทช่วยเล่นแทนได้ทันที`;
      }
    } else {
      disconnectedAlert.classList.add('hidden');
    }
  }

  // Also sync the Party Roster button in top HUD
  const btnParty = document.getElementById('btn-open-party-roster');
  if (btnParty) {
    if (isAllRolled) {
      btnParty.innerHTML = `<span>👥 สมาชิกในกลุ่ม (${rolledCount}/${totalPlayers}) ✓</span>`;
      btnParty.style.borderColor = 'rgba(16, 185, 129, 0.6)';
      btnParty.style.color = '#34d399';
    } else {
      btnParty.innerHTML = `<span>👥 สมาชิกในกลุ่ม (${rolledCount}/${totalPlayers})</span>`;
      btnParty.style.borderColor = '';
      btnParty.style.color = '';
    }
  }

  // If party roster modal is currently open, live-refresh its list too
  const modalRoster = document.getElementById('modal-party-roster');
  if (modalRoster && !modalRoster.classList.contains('hidden') && currentRoom) {
    const districtNameEl = document.getElementById('party-district-name');
    if (districtNameEl) {
      if (isAllRolled) {
        districtNameEl.innerHTML = `<span>${currentRoom.districtName} (${totalPlayers}/10 คน)</span> • <span style="color: #34d399; font-weight: 600;">✅ ทอยครบแล้ว ${rolledCount}/${totalPlayers} คน</span>`;
      } else {
        districtNameEl.innerHTML = `<span>${currentRoom.districtName} (${totalPlayers}/10 คน)</span> • <span style="color: #38bdf8; font-weight: 500;">ทอยแล้ว ${rolledCount}/${totalPlayers} คน</span>`;
      }
    }
  }
}

// Render District Waiting Hall
function renderWaitingRoom(room, player) {
  const badge = document.getElementById('waiting-district-badge');
  const codeDisplay = document.getElementById('waiting-room-code-display');
  const countEl = document.getElementById('waiting-roster-count');
  const bar = document.getElementById('waiting-progress-bar');
  const list = document.getElementById('waiting-members-list');
  const btnStartWithBots = document.getElementById('btn-start-with-bots');
  const btnCopyCode = document.getElementById('btn-copy-district-code');

  if (badge) badge.textContent = `📍 ${room.districtName} (${room.code})`;
  if (codeDisplay) codeDisplay.textContent = room.code;

  const total = room.players ? room.players.length : 0;
  if (countEl) countEl.textContent = `${total} / 10 คน`;
  if (bar) bar.style.width = `${Math.min(100, total * 10)}%`;

  if (list && room.players) {
    list.innerHTML = room.players.map((p, idx) => {
      const isMe = p.id === player.id;
      return `
        <div class="waiting-member-item" style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 8px; font-size: 0.88rem; border-left: 3px solid ${isMe ? '#10b981' : '#38bdf8'}; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">${p.avatar || '👤'}</span>
            <div>
              <strong style="color: #fff;">${idx + 1}. ${p.name} ${isMe ? '(คุณ)' : (p.isBot ? '🤖' : '')}</strong>
              <small style="display: block; color: #94a3b8; font-size: 0.75rem;">${p.className || p.title}</small>
            </div>
          </div>
          <span style="color: #34d399; font-size: 0.78rem; font-weight: 500;">พร้อมแล้ว ✓</span>
        </div>
      `;
    }).join('');
  }

  // Bind Copy District Code Button
  if (btnCopyCode && !btnCopyCode.dataset.bound) {
    btnCopyCode.dataset.bound = 'true';
    btnCopyCode.onclick = () => {
      playSound('click');
      const code = (state.currentRoom && state.currentRoom.code) || room.code;
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          showToast(`📋 คัดลอกรหัสกลุ่ม ${code} สำเร็จ! ส่งให้เพื่อนเข้าร่วมได้เลย`, 'success');
        }).catch(() => {
          showToast(`รหัสกลุ่ม: ${code}`, 'info');
        });
      }
    };
  }

  if (btnStartWithBots && !btnStartWithBots.dataset.bound) {
    btnStartWithBots.dataset.bound = 'true';
    btnStartWithBots.onclick = () => {
      playSound('fanfare');
      btnStartWithBots.disabled = true;
      btnStartWithBots.innerHTML = '<span>⏳ กำลังเพิ่มผู้เล่นจำลองเข้าสู่ระบบ...</span>';
      if (socket) {
        socket.emit('district:start_with_bots');
      }
    };
  }
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

// Render Actions based on Role & Chapter (Dynamic per round or thematic fallback)
function renderClassActionChoices(player, room, chapter, roundActions) {
  const container = document.getElementById('pl-action-choices-container');
  if (!container) return;

  const role = player.roleType;
  const actionsMap = roundActions || state.currentRoundActions || room?.currentRoundActions || (room?.roundActions && room.roundActions[room.round]);
  let actions = (actionsMap && actionsMap[role]) ? actionsMap[role] : null;

  if (!actions || actions.length === 0) {
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
  }

  // Ensure selectedActionId is valid for the current round's actions
  const selectedExists = actions.some(act => act.id === selectedActionId);
  if (!selectedExists && actions.length > 0) {
    selectedActionId = actions[0].id;
    selectedActionName = actions[0].name;
  } else {
    const currentAction = actions.find(act => act.id === selectedActionId);
    if (currentAction) {
      selectedActionName = currentAction.name;
    }
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
    pill.textContent = `ทางเลือกที่เลือก: ${selectedActionName}`;
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

  // District Advance Round Button (Inside Stage 3 Post-Roll Box)
  const btnDistrictAdvance = document.getElementById('btn-district-advance');
  if (btnDistrictAdvance && !btnDistrictAdvance.dataset.hasListener) {
    btnDistrictAdvance.dataset.hasListener = 'true';
    btnDistrictAdvance.addEventListener('click', () => {
      playSound('cash');
      btnDistrictAdvance.disabled = true;
      btnDistrictAdvance.innerHTML = '<span>⏳ กำลังประมวลผลเศรษฐกิจ...</span>';
      if (socket) {
        socket.emit('district:advance_round');
      }
      setTimeout(() => {
        btnDistrictAdvance.disabled = false;
        btnDistrictAdvance.innerHTML = '<span>🚩 สรุปผลและเปิดรอบถัดไปทันที ➔</span>';
      }, 2000);
    });
  }

  // Force Bot Takeover for Disconnected Players Button
  const btnTakeover = document.getElementById('btn-force-bot-takeover');
  if (btnTakeover && !btnTakeover.dataset.hasListener) {
    btnTakeover.dataset.hasListener = 'true';
    btnTakeover.addEventListener('click', () => {
      playSound('click');
      btnTakeover.disabled = true;
      btnTakeover.innerHTML = '<span>⏳ กำลังส่งบอทเข้าช่วยเล่น...</span>';
      if (socket) {
        socket.emit('district:takeover_disconnected');
      }
      setTimeout(() => {
        btnTakeover.disabled = false;
        btnTakeover.innerHTML = '<span>🤖 ให้บอทช่วยเล่นแทนคนที่หลุดทันที</span>';
      }, 2500);
    });
  }
}

// Trigger D20 Roll with Audio & Realistic Slot Machine Shuffling
export function triggerPlayerD20Roll() {
  if (isRolling) return;
  if (!selectedActionId) {
    showToast('กรุณาเลือก 1 แผนการทำงานในขั้นตอนที่ 2 ก่อนทอยลูกเต๋า', 'warning');
    window.goToPlayerStage(2);
    return;
  }
  isRolling = true;
  rollStartTime = Date.now();

  playSound('dice');

  const btnRoll = document.getElementById('btn-roll-d20');
  const diceElement = document.getElementById('d20-dice-cube');
  const pedestal = document.getElementById('d20-pre-roll-pedestal');
  const diceHint = document.getElementById('d20-dice-hint');
  const resultBanner = document.getElementById('d20-result-banner');
  const numEl = document.getElementById('d20-display-number');

  if (btnRoll) {
    btnRoll.disabled = true;
    btnRoll.innerHTML = `<span>🎲 ลูกเต๋ากำลังหมุนสุ่ม...</span>`;
  }
  // Reveal D20 cube with pop-in animation, hide pedestal
  if (pedestal) pedestal.classList.add('hidden');
  if (diceElement) {
    diceElement.classList.remove('hidden');
    diceElement.classList.add('rolling');
    diceElement.classList.add('scale-pop-in');
  }
  if (diceHint) diceHint.classList.remove('hidden');
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
      btnRoll.innerHTML = `<span>✅ ดำเนินการในรอบนี้แล้ว</span>`;
    }

    // 3. Switch from action button to quarter waiting box
    const preRollBox = document.getElementById('stage3-pre-roll-actions');
    const postRollBox = document.getElementById('stage3-post-roll-box');
    if (preRollBox) preRollBox.classList.add('hidden');
    if (postRollBox) postRollBox.classList.remove('hidden');
    updatePostRollWaitingState(state.currentRoom, myPlayer);

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
      spawnFloatingNumber('🌟 ทอยได้ 20 แต้มเต็ม!', 'gold');
    } else if (isNat1) {
      bannerClass = 'banner-nat1';
      playSound('crisis');
      triggerScreenShake('red');
      spawnFloatingNumber('⚠️ ทอยได้ 1 แต้ม มีอุปสรรค!', 'hp-loss');
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
        ลูกเต๋า: <strong>${rollResult.d20}</strong> 
        + แต้มโบนัส: <strong>${rollResult.modifier >= 0 ? `+${rollResult.modifier}` : rollResult.modifier}</strong> 
        = ผลรวม <strong>${rollResult.totalScore}</strong> (เกณฑ์ผ่าน ${rollResult.dc} แต้ม)
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
    btnRoll.innerHTML = `<span>✅ ดำเนินการในรอบนี้แล้ว</span>`;
  }

  const preRollBox = document.getElementById('stage3-pre-roll-actions');
  const postRollBox = document.getElementById('stage3-post-roll-box');
  if (preRollBox) preRollBox.classList.add('hidden');
  if (postRollBox) postRollBox.classList.remove('hidden');
  updatePostRollWaitingState(state.currentRoom, state.myPlayer);
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
  if (activeTypewriterTimer) {
    clearTimeout(activeTypewriterTimer);
    activeTypewriterTimer = null;
  }
  currentTypingLore = null;

  const aiGmBox = document.getElementById('ai-gm-lore-box');
  const aiGmText = document.getElementById('ai-gm-lore-text');
  if (aiGmBox) {
    aiGmBox.classList.add('hidden');
  }
  if (aiGmText) {
    aiGmText.textContent = '';
  }

  // 3. Reset dice arena: hide dice cube and show pedestal
  const diceCube = document.getElementById('d20-dice-cube');
  const pedestal = document.getElementById('d20-pre-roll-pedestal');
  const diceHint = document.getElementById('d20-dice-hint');
  const numEl = document.getElementById('d20-display-number');

  if (diceCube) {
    diceCube.classList.add('hidden');
    diceCube.classList.remove('rolling');
  }
  if (pedestal) pedestal.classList.remove('hidden');
  if (diceHint) diceHint.classList.add('hidden');
  if (numEl) numEl.textContent = '20';

  // 4. Reset roll button & Stage 3 action bars
  const btnRoll = document.getElementById('btn-roll-d20');
  if (btnRoll) {
    btnRoll.disabled = false;
    btnRoll.innerHTML = `<span>🎲 กดทอยลูกเต๋าตัดสินผล ➔</span>`;
  }
  const preRollBox = document.getElementById('stage3-pre-roll-actions');
  const postRollBox = document.getElementById('stage3-post-roll-box');
  if (preRollBox) preRollBox.classList.remove('hidden');
  if (postRollBox) postRollBox.classList.add('hidden');

  // 5. Reset selected action so player chooses fresh card
  selectedActionId = null;
  const pill = document.getElementById('dice-selected-action-pill');
  if (pill) pill.textContent = 'ทางเลือกที่เลือก: -';
}
window.onNewQuarterStarted = onNewQuarterStarted;

// Active Typewriter Timer & Current Text State Tracker
let activeTypewriterTimer = null;
let currentTypingLore = null;

// Render AI Dungeon Master Lore Box with Typewriter Effect
export function renderAiGmLoreBox(loreText, animate = true) {
  const box = document.getElementById('ai-gm-lore-box');
  const textEl = document.getElementById('ai-gm-lore-text');
  if (!box || !textEl || !loreText) return;

  // If already actively typing this exact text, let it finish without interruption
  if (currentTypingLore === loreText && activeTypewriterTimer) {
    return;
  }

  // If already finished and showing this exact text, do nothing (no duplicate typewriter)
  if (textEl.textContent.trim() === loreText.trim() && !box.classList.contains('hidden')) {
    return;
  }

  box.classList.remove('hidden');

  if (animate) {
    currentTypingLore = loreText;
    typewriterEffect(textEl, loreText, 25);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    // Instant display (e.g. restoring on room update or page refresh)
    if (activeTypewriterTimer) {
      clearTimeout(activeTypewriterTimer);
      activeTypewriterTimer = null;
    }
    currentTypingLore = null;
    textEl.textContent = loreText;
  }
}

// Typewriter Text Animation with cancellation of previous timer
function typewriterEffect(element, text, speed = 25) {
  if (activeTypewriterTimer) {
    clearTimeout(activeTypewriterTimer);
    activeTypewriterTimer = null;
  }
  element.textContent = '';
  let i = 0;
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      activeTypewriterTimer = setTimeout(type, speed);
    } else {
      activeTypewriterTimer = null;
      currentTypingLore = null;
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
    showToast('กำลังโหลดข้อมูลสมาชิกในกลุ่ม...', 'info');
    return;
  }

  const listContainer = document.getElementById('party-roster-list');
  const districtNameEl = document.getElementById('party-district-name');

  const totalPlayers = room.players ? room.players.length : 0;
  const rolledCount = room.players ? room.players.filter(p => p.hasRolledThisRound).length : 0;

  const isAllRolled = totalPlayers > 0 && rolledCount >= totalPlayers;

  if (districtNameEl) {
    if (isAllRolled) {
      districtNameEl.innerHTML = `<span>${room.districtName} (${totalPlayers}/10 คน)</span> • <span style="color: #34d399; font-weight: 600;">✅ ทอยครบแล้ว ${rolledCount}/${totalPlayers} คน</span>`;
    } else {
      districtNameEl.innerHTML = `<span>${room.districtName} (${totalPlayers}/10 คน)</span> • <span style="color: #38bdf8; font-weight: 500;">ทอยแล้ว ${rolledCount}/${totalPlayers} คน</span>`;
    }
  }

  if (listContainer && room.players) {
    listContainer.innerHTML = room.players.map((p, idx) => {
      const isMe = state.myPlayer && p.id === state.myPlayer.id;

      // Status badge: rolled vs planning vs disconnected
      let statusBadge = '';
      if (p.hasRolledThisRound) {
        const isBotRoll = p.lastActionDesc && p.lastActionDesc.includes('บอทช่วยเล่นแทน');
        statusBadge = isBotRoll
          ? `<span style="display: inline-flex; align-items: center; font-size: 0.7rem; padding: 1px 7px; border-radius: 12px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-weight: 500;">🤖 บอทเล่นแทนแล้ว</span>`
          : `<span style="display: inline-flex; align-items: center; font-size: 0.7rem; padding: 1px 7px; border-radius: 12px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-weight: 500;">✅ ทอยแล้ว</span>`;
      } else if (p.isDisconnected && !p.isBot) {
        statusBadge = `<span style="display: inline-flex; align-items: center; font-size: 0.7rem; padding: 1px 7px; border-radius: 12px; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); font-weight: 500;">⚠️ หลุดการเชื่อมต่อ</span>`;
      } else {
        statusBadge = `<span style="display: inline-flex; align-items: center; font-size: 0.7rem; padding: 1px 7px; border-radius: 12px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); font-weight: 500;">⏳ กำลังวางแผน</span>`;
      }

      // Role tag: Bot or Me
      const roleBadge = p.isBot
        ? `<span style="font-size: 0.68rem; padding: 1px 5px; border-radius: 6px; background: rgba(148, 163, 184, 0.2); color: #94a3b8; margin-left: 4px;">🤖 บอท</span>`
        : (isMe ? `<span style="font-size: 0.68rem; padding: 1px 5px; border-radius: 6px; background: rgba(56, 189, 248, 0.25); color: #38bdf8; font-weight: bold; margin-left: 4px;">(คุณ)</span>` : '');

      const borderColor = isMe ? '#10b981' : (p.hasRolledThisRound ? '#34d399' : (p.isDisconnected && !p.isBot ? '#ef4444' : '#f59e0b'));

      return `
        <div class="party-player-item ${isMe ? 'party-me-highlight' : ''}" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.35); padding: 8px 12px; border-radius: 8px; margin-bottom: 7px; border-left: 3px solid ${borderColor}; border-top: 1px solid rgba(255,255,255,0.04);">
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
            <small style="color: ${p.qol > 50 ? '#10b981' : '#f87171'};">❤️ คุณภาพชีวิต ${p.qol || 50}%</small>
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

