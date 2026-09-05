/* =========================================================
   game.js — Client Entry Point & UI Coordinator
   Supports 200-Player Master Screen, Quick Join, and D20 Roll
   ========================================================= */

import { loadAllPartials } from './js/ui/partialLoader.js';
import { socket, state, setIsProjector, toggleSound } from './js/state.js';
import { playSound } from './js/ui/audio.js';
import { showToast } from './js/ui/toast.js';
import { switchView } from './js/ui/views.js';
import { initSocketListeners } from './js/events/socketEvents.js';
import { triggerPlayerD20Roll, triggerPlayerD20Roll as triggerD20Roll } from './js/views/playerView.js';
import { collapseMasterQrSidebar, expandMasterQrSidebar } from './js/views/masterView.js';

async function bootApp() {
  await loadAllPartials();
  initEventListeners();
  initSocketListeners();
  checkUrlRouting();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

// Check URL Query params (e.g. ?view=master or ?view=player) & Restore Session
function checkUrlRouting() {
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view');

  if (viewParam === 'master') {
    openMasterScreen();
    return;
  }

  // Check if player has an existing session in sessionStorage for seamless refresh
  const sessionStr = sessionStorage.getItem('dnd_player_session');
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      if (session && session.playerId && session.roomCode) {
        showToast('กำลังเชื่อมต่อเข้าสู่เขตเดิมของคุณ...', 'info', 2000);
        const attemptReconnect = () => {
          if (socket) {
            socket.emit('player:reconnect', {
              playerId: session.playerId,
              roomCode: session.roomCode
            });
          }
        };

        if (socket && socket.connected) {
          attemptReconnect();
        } else if (socket) {
          socket.once('connect', attemptReconnect);
        }
        return;
      }
    } catch (e) {
      console.warn('Invalid player session JSON:', e);
      sessionStorage.removeItem('dnd_player_session');
    }
  }

  // Default fallback: Switch to lobby
  switchView('lobby');
}

function openMasterScreen() {
  playSound('fanfare');
  switchView('master');
  if (socket) {
    socket.emit('master:join');
  }

  // Load server info and real QR Code immediately
  fetch('/api/server-info')
    .then(res => res.json())
    .then(data => {
      if (data && data.qrDataUrl) {
        import('./js/views/masterView.js').then(mod => {
          mod.updateMasterQrCode(data.qrDataUrl, data.mobileScanUrl || data.targetUrl);
        });
      }
    })
    .catch(err => console.warn('Could not fetch server-info:', err));

  // Check Admin authentication status
  if (sessionStorage.getItem('master_auth') !== 'true') {
    const modalAuth = document.getElementById('modal-admin-auth');
    if (modalAuth) {
      setTimeout(() => {
        modalAuth.classList.remove('hidden');
        const inputPin = document.getElementById('input-admin-pin');
        if (inputPin) inputPin.focus();
      }, 400);
    }
  }

  showToast('เข้าสู่หน้าจอใหญ่ Master National Command Center (200 Players) เรียบร้อยแล้ว', 'success', 3000);
}

function initEventListeners() {
  // Sound Toggle
  const btnSound = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      const enabled = toggleSound();
      if (soundIcon) soundIcon.textContent = enabled ? '🔊' : '🔇';
      showToast(enabled ? 'เปิดเสียงประกอบแล้ว' : 'ปิดเสียงประกอบแล้ว', 'warning', 1800);
    });
  }

  // Toggle Custom District Input in Lobby
  const btnToggleCustom = document.getElementById('btn-toggle-custom-district');
  const customBox = document.getElementById('custom-district-input-box');
  if (btnToggleCustom && customBox) {
    btnToggleCustom.addEventListener('click', () => {
      playSound('click');
      customBox.classList.toggle('hidden');
    });
  }

  // Quick Join Button (Single Click / QR Code destination for 200 players)
  const btnQuickJoin = document.getElementById('btn-quick-join-master');
  if (btnQuickJoin) {
    btnQuickJoin.addEventListener('click', () => {
      playSound('click');
      const nameInput = document.getElementById('input-player-name');
      const playerName = (nameInput ? nameInput.value : '').trim();

      btnQuickJoin.disabled = true;
      btnQuickJoin.innerHTML = '<span>⏳ กำลังจัดสรรกลุ่มและบทบาท...</span>';

      if (socket) {
        socket.emit('player:quick_join_master', {
          playerName: playerName || `ผู้เล่น_${Math.floor(Math.random() * 900 + 100)}`
        });
      }

      setTimeout(() => {
        btnQuickJoin.disabled = false;
        btnQuickJoin.innerHTML = '<span>⚡ สุ่มบทบาท & เข้าเล่นเกมทันที ➔</span>';
      }, 3500);
    });
  }

  // Standard Join Room
  const btnJoin = document.getElementById('btn-join-room');
  if (btnJoin) {
    btnJoin.addEventListener('click', () => {
      playSound('click');
      const roomInput = document.getElementById('input-room-code');
      const nameInput = document.getElementById('input-player-name');
      const roomCode = (roomInput ? roomInput.value : '').trim().toUpperCase();
      const playerName = (nameInput ? nameInput.value : '').trim();

      if (!roomCode) {
        showToast('กรุณากรอกรหัสห้อง เช่น DIST-01 หรือกดเข้าร่วมด่วน', 'warning');
        return;
      }

      btnJoin.disabled = true;
      btnJoin.innerHTML = '<span>⏳ กำลังเข้าร่วม...</span>';
      if (socket) {
        socket.emit('join_room', {
          roomCode,
          playerName: playerName || 'ผู้เล่น',
          isProjector: false
        });
      }
    });
  }

  // Enter key support for Lobby Inputs
  const nameInput = document.getElementById('input-player-name');
  const roomInput = document.getElementById('input-room-code');

  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const customBox = document.getElementById('custom-room-section');
        const customRoomCode = (roomInput ? roomInput.value : '').trim();
        // If user has custom room code section open with a code typed, join room; otherwise Quick Join
        if (customBox && !customBox.classList.contains('hidden') && customRoomCode) {
          if (btnJoin && !btnJoin.disabled) btnJoin.click();
        } else {
          if (btnQuickJoin && !btnQuickJoin.disabled) btnQuickJoin.click();
        }
      }
    });
  }

  if (roomInput) {
    roomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (btnJoin && !btnJoin.disabled) btnJoin.click();
      }
    });
  }

  // Legacy Host Create Room
  const btnCreate = document.getElementById('btn-create-room');
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      playSound('click');
      setIsProjector(true);
      switchView('projector');
      if (socket) socket.emit('create_room');
    });
  }

  // D20 Roll Trigger Button on Player View
  const btnRollD20 = document.getElementById('btn-roll-d20');
  if (btnRollD20) {
    btnRollD20.addEventListener('click', () => {
      triggerD20Roll();
    });
  }

  // Advance Chapter in Player District
  const btnAdvanceRound = document.getElementById('btn-district-advance');
  if (btnAdvanceRound) {
    btnAdvanceRound.addEventListener('click', () => {
      playSound('cash');
      btnAdvanceRound.disabled = true;
      btnAdvanceRound.innerHTML = '<span>⏳ กำลังประมวลผลเศรษฐกิจ...</span>';
      if (socket) {
        socket.emit('district:advance_round');
      }
      setTimeout(() => {
        btnAdvanceRound.disabled = false;
        btnAdvanceRound.innerHTML = '<span>🚩 ไปยังรอบถัดไป ➔</span>';
      }, 1500);
    });
  }

  // Fill Bots in Player District
  const btnFillBots = document.getElementById('btn-district-fill-bots');
  if (btnFillBots) {
    btnFillBots.addEventListener('click', () => {
      playSound('click');
      if (socket) {
        socket.emit('district:fill_bots');
        showToast('เติมผู้เล่นจำลอง (บอท) ครบ 10 คนแล้ว!', 'success');
      }
    });
  }

  // Close District Inspector Modal
  const btnCloseInspector = document.getElementById('btn-close-inspector-modal');
  const modalInspector = document.getElementById('modal-district-inspector');
  if (btnCloseInspector && modalInspector) {
    btnCloseInspector.addEventListener('click', () => {
      playSound('click');
      modalInspector.classList.add('hidden');
    });
  }
  if (modalInspector) {
    modalInspector.addEventListener('click', (e) => {
      if (e.target === modalInspector) {
        modalInspector.classList.add('hidden');
      }
    });
  }

  // Theory Modal Toggle
  const modalTheory = document.getElementById('modal-theory');
  const btnTheory = document.getElementById('btn-theory-modal');
  const btnCloseTheory = document.getElementById('btn-close-modal');

  if (btnTheory && modalTheory) {
    btnTheory.addEventListener('click', () => {
      playSound('click');
      modalTheory.classList.remove('hidden');
    });
  }
  if (btnCloseTheory && modalTheory) {
    btnCloseTheory.addEventListener('click', () => {
      playSound('click');
      modalTheory.classList.add('hidden');
    });
  }
  if (modalTheory) {
    modalTheory.addEventListener('click', (e) => {
      if (e.target === modalTheory) {
        modalTheory.classList.add('hidden');
      }
    });
  }

  // Copy Master Link Button on Master Screen
  const btnCopyMasterLink = document.getElementById('btn-copy-master-link');
  if (btnCopyMasterLink) {
    btnCopyMasterLink.addEventListener('click', () => {
      playSound('click');
      const qrUrl = document.getElementById('master-qr-url-text')?.textContent;
      const fullUrl = (qrUrl && qrUrl.startsWith('http')) ? qrUrl : `${window.location.origin}/?view=player`;
      navigator.clipboard.writeText(fullUrl).then(() => {
        showToast(`คัดลอกลิงก์: ${fullUrl} เรียบร้อยแล้ว!`, 'success');
      }).catch(() => {
        showToast(`ลิงก์ผู้เล่น: ${fullUrl}`, 'info');
      });
    });
  }

  // Edit Master QR Code URL (Glassmorphism Modal)
  const modalEditQr = document.getElementById('modal-edit-qr');
  const btnEditQr = document.getElementById('btn-edit-qr-url');
  const btnCloseEditQr = document.getElementById('btn-close-edit-qr-modal');
  const btnCancelEditQr = document.getElementById('btn-cancel-edit-qr');
  const btnSubmitEditQr = document.getElementById('btn-submit-edit-qr');
  const inputCustomQr = document.getElementById('input-custom-qr-url');

  if (btnEditQr && modalEditQr) {
    btnEditQr.addEventListener('click', () => {
      playSound('click');
      const currentUrl = document.getElementById('master-qr-url-text')?.textContent || '';
      if (inputCustomQr) {
        inputCustomQr.value = currentUrl.startsWith('http') ? currentUrl : `${window.location.origin}/?view=player`;
        setTimeout(() => inputCustomQr.focus(), 50);
      }
      modalEditQr.classList.remove('hidden');
    });

    const closeQrModal = () => {
      modalEditQr.classList.add('hidden');
    };

    if (btnCloseEditQr) btnCloseEditQr.addEventListener('click', closeQrModal);
    if (btnCancelEditQr) btnCancelEditQr.addEventListener('click', closeQrModal);

    modalEditQr.addEventListener('click', (e) => {
      if (e.target === modalEditQr) closeQrModal();
    });

    const submitQrModal = () => {
      const customUrl = (inputCustomQr ? inputCustomQr.value : '').trim();
      if (!customUrl) {
        showToast('กรุณากรอก URL / IP ที่ถูกต้อง', 'warning');
        return;
      }
      if (socket) {
        socket.emit('master:request_qr', { customUrl });
      }
      playSound('click');
      closeQrModal();
      showToast('อัปเดต QR Code และลิงก์สำเร็จ!', 'success');
    };

    if (btnSubmitEditQr) btnSubmitEditQr.addEventListener('click', submitQrModal);
    if (inputCustomQr) {
      inputCustomQr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitQrModal();
        } else if (e.key === 'Escape') {
          closeQrModal();
        }
      });
    }
  }

  // Master QR Sidebar Collapse / Expand Controls
  const btnCollapseQr = document.getElementById('btn-collapse-qr');
  if (btnCollapseQr) {
    btnCollapseQr.addEventListener('click', () => {
      playSound('click');
      collapseMasterQrSidebar();
    });
  }

  const btnFloatingQrTab = document.getElementById('btn-floating-qr-tab');
  if (btnFloatingQrTab) {
    btnFloatingQrTab.addEventListener('click', () => {
      playSound('click');
      expandMasterQrSidebar();
    });
  }

  // Fullscreen Master QR Zoom Modal (Projector View)
  const masterQrHero = document.getElementById('master-qr-hero');
  const modalQrZoom = document.getElementById('master-qr-modal');
  const btnCloseQrZoom = document.getElementById('btn-close-qr-modal');
  const btnModalClose = document.getElementById('btn-modal-close');
  const btnModalCopyLink = document.getElementById('btn-modal-copy-link');

  if (masterQrHero && modalQrZoom) {
    masterQrHero.addEventListener('click', () => {
      playSound('click');
      const mainQrImg = document.getElementById('master-qr-img');
      const modalImg = document.getElementById('master-qr-modal-img');
      if (mainQrImg && modalImg && mainQrImg.src) {
        modalImg.src = mainQrImg.src;
      }
      const qrUrl = document.getElementById('master-qr-url-text')?.textContent;
      const modalUrl = document.getElementById('master-qr-modal-url');
      if (qrUrl && modalUrl) {
        modalUrl.textContent = qrUrl;
      }
      const totalPlayersEl = document.getElementById('master-total-players');
      const modalCount = document.getElementById('master-qr-modal-count');
      if (totalPlayersEl && modalCount) {
        modalCount.textContent = totalPlayersEl.textContent;
      }
      modalQrZoom.classList.remove('hidden');
    });

    const closeZoomModal = () => {
      modalQrZoom.classList.add('hidden');
    };

    if (btnCloseQrZoom) btnCloseQrZoom.addEventListener('click', closeZoomModal);
    if (btnModalClose) btnModalClose.addEventListener('click', closeZoomModal);

    modalQrZoom.addEventListener('click', (e) => {
      if (e.target === modalQrZoom) closeZoomModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modalQrZoom.classList.contains('hidden')) {
        closeZoomModal();
      }
    });
  }

  if (btnModalCopyLink) {
    btnModalCopyLink.addEventListener('click', () => {
      playSound('click');
      const qrUrl = document.getElementById('master-qr-url-text')?.textContent;
      const fullUrl = (qrUrl && qrUrl.startsWith('http')) ? qrUrl : `${window.location.origin}/?view=player`;
      navigator.clipboard.writeText(fullUrl).then(() => {
        showToast(`คัดลอกลิงก์: ${fullUrl} เรียบร้อยแล้ว!`, 'success');
      }).catch(() => {
        showToast(`ลิงก์ผู้เล่น: ${fullUrl}`, 'info');
      });
    });
  }

  // Security: Admin PIN Authentication Controls
  const modalAuth = document.getElementById('modal-admin-auth');
  const btnMasterAuth = document.getElementById('btn-master-auth');
  const btnCancelAuth = document.getElementById('btn-cancel-admin-pin');
  const btnSubmitAuth = document.getElementById('btn-submit-admin-pin');
  const inputPin = document.getElementById('input-admin-pin');

  if (btnMasterAuth && modalAuth) {
    btnMasterAuth.addEventListener('click', () => {
      playSound('click');
      modalAuth.classList.remove('hidden');
      if (inputPin) {
        inputPin.value = '';
        inputPin.focus();
      }
    });
  }

  if (btnCancelAuth && modalAuth) {
    btnCancelAuth.addEventListener('click', () => {
      playSound('click');
      modalAuth.classList.add('hidden');
    });
  }

  function submitAdminPin() {
    const pin = (inputPin ? inputPin.value : '').trim();
    if (!pin) {
      showToast('กรุณากรอกรหัส PIN', 'warning');
      return;
    }
    playSound('click');
    if (socket) {
      socket.emit('master:auth', { pin });
    }
  }

  if (btnSubmitAuth) {
    btnSubmitAuth.addEventListener('click', submitAdminPin);
  }

  if (inputPin) {
    inputPin.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submitAdminPin();
      }
    });
  }

  // Master Global Controls (National Command Center)
  const btnMasterStart = document.getElementById('btn-master-start');
  if (btnMasterStart) {
    btnMasterStart.addEventListener('click', () => {
      playSound('fanfare');
      if (socket) {
        socket.emit('master:start_game');
        showToast('🚀 เริ่มเกมและจัดสรรผู้เล่นจำลอง (บอท) ครบทุกกลุ่มแล้ว!', 'success');
      }
      collapseMasterQrSidebar();
    });
  }

  const btnMasterSettleAll = document.getElementById('btn-master-global-settle');
  if (btnMasterSettleAll) {
    btnMasterSettleAll.addEventListener('click', () => {
      playSound('cash');
      btnMasterSettleAll.disabled = true;
      btnMasterSettleAll.innerHTML = '<span>⏳ กำลังประมวลผลทั้งประเทศ...</span>';
      if (socket) {
        socket.emit('master:global_settle');
      }
      setTimeout(() => {
        btnMasterSettleAll.disabled = false;
        btnMasterSettleAll.innerHTML = '<span>⚙️ สรุปยอดและประมวลผลทุกกลุ่ม (Global Settle)</span>';
        showToast('⚙️ ประมวลผลเศรษฐกิจและค่า Gini ทุกกลุ่มสำเร็จ!', 'success');
      }, 1200);
    });
  }

  const btnMasterAdvanceAll = document.getElementById('btn-master-advance-all');
  if (btnMasterAdvanceAll) {
    btnMasterAdvanceAll.addEventListener('click', () => {
      playSound('fanfare');
      btnMasterAdvanceAll.disabled = true;
      btnMasterAdvanceAll.innerHTML = '<span>⏳ กำลังเข้าสู่รอบใหม่...</span>';
      if (socket) {
        socket.emit('master:advance_all');
      }
      setTimeout(() => {
        btnMasterAdvanceAll.disabled = false;
        btnMasterAdvanceAll.innerHTML = '<span>⏭️ เริ่มรอบถัดไปพร้อมกันทั้งหมด (Next Round)</span>';
      }, 1200);
    });
  }

  // Restart Game Button
  const btnRestart = document.getElementById('btn-restart-game');
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      sessionStorage.removeItem('dnd_player_session');
      window.location.href = '/';
    });
  }
}
