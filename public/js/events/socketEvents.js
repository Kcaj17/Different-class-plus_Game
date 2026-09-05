/* =========================================================
   socketEvents.js — Socket.IO Event Handlers & Orchestration
   Supports Master Command Center, D20 Rolls, and AI GM
   ========================================================= */

import { socket, state, setMyPlayer, setCurrentRoomCode, setCurrentRoom, setCurrentRoundActions } from '../state.js';
import { playSound } from '../ui/audio.js';
import { showToast } from '../ui/toast.js';
import { switchView } from '../ui/views.js';
import { renderMasterScreen, openDistrictInspector, updateMasterQrCode } from '../views/masterView.js';
import { renderPlayerView, showRollResolution, renderAiGmLoreBox, showCharacterReveal, onNewQuarterStarted, handleRollError, updatePostRollWaitingState } from '../views/playerView.js';
import { renderProjectorView } from '../views/projectorView.js';
import { renderGameOverView } from '../views/gameOverView.js';

export function initSocketListeners() {
  if (!socket) return;

  // ---------------------------------------------------------
  // MASTER SCREEN EVENTS
  // ---------------------------------------------------------
  socket.on('master:national_update', ({ aggregates, liveEvent, qrDataUrl, joinUrl }) => {
    state.nationalAggregates = aggregates;
    renderMasterScreen(aggregates, liveEvent, { qrDataUrl, joinUrl });
  });

  socket.on('master:qr_updated', ({ qrDataUrl, joinUrl }) => {
    updateMasterQrCode(qrDataUrl, joinUrl);
    showToast('อัปเดต QR Code และลิงก์เข้าเล่นใหม่เรียบร้อยแล้ว!', 'success');
  });

  socket.on('master:district_details', (data) => {
    openDistrictInspector(data);
  });

  // ---------------------------------------------------------
  // PLAYER D&D EVENTS
  // ---------------------------------------------------------
  socket.on('player:init', ({ room, myPlayer, roundInfo, roundActions }) => {
    setMyPlayer(myPlayer);
    setCurrentRoomCode(room.code);
    setCurrentRoom(room);
    if (roundActions) setCurrentRoundActions(roundActions);

    // Save player session to sessionStorage for seamless refresh
    try {
      sessionStorage.setItem('dnd_player_session', JSON.stringify({
        playerId: myPlayer.id,
        roomCode: room.code,
        playerName: myPlayer.name
      }));
    } catch (e) {
      console.warn('Could not save session to sessionStorage:', e);
    }

    // Show dramatic Veil of Ignorance Character Reveal first!
    showCharacterReveal(myPlayer, room, () => {
      switchView('player');
      if (window.goToPlayerStage) window.goToPlayerStage(1);
      renderPlayerView(myPlayer, room, roundInfo, roundActions);
      showToast(`เข้าสู่ ${room.districtName} เรียบร้อยแล้ว!`, 'success', 3500);
    });
  });

  socket.on('player:reconnected', ({ room, myPlayer, roundInfo, roundActions }) => {
    setMyPlayer(myPlayer);
    setCurrentRoomCode(room.code);
    setCurrentRoom(room);
    if (roundActions) setCurrentRoundActions(roundActions);

    // Refresh saved session in sessionStorage
    try {
      sessionStorage.setItem('dnd_player_session', JSON.stringify({
        playerId: myPlayer.id,
        roomCode: room.code,
        playerName: myPlayer.name
      }));
    } catch (e) {
      console.warn('Could not save session to sessionStorage:', e);
    }

    // Hide any character reveal modal if open
    const modalReveal = document.getElementById('modal-character-reveal');
    if (modalReveal) modalReveal.classList.add('hidden');

    if (room.status === 'gameover') {
      switchView('gameover');
      return;
    }

    // Direct switch to player view without Gacha card reveal
    switchView('player');
    renderPlayerView(myPlayer, room, roundInfo || room.currentRoundData, roundActions);

    if (room.status === 'playing') {
      if (myPlayer.hasRolledThisRound) {
        if (window.goToPlayerStage) window.goToPlayerStage(3);
      } else {
        if (window.goToPlayerStage) window.goToPlayerStage(1);
      }
    }

    showToast(`ยินดีต้อนรับกลับมา! เชื่อมต่อเข้าสู่ ${room.districtName} สำเร็จ`, 'success', 3500);
    playSound('click');
  });

  socket.on('player:reconnect_failed', ({ message }) => {
    sessionStorage.removeItem('dnd_player_session');
    switchView('lobby');
    showToast(message || 'ไม่สามารถกลับเข้าสู่ห้องเดิมได้ กรุณาเข้าร่วมใหม่อีกครั้ง', 'warning', 4000);
  });

  socket.on('player:roll_resolved', ({ rollResult, myPlayer, roomMacro }) => {
    setMyPlayer(myPlayer);
    showRollResolution(rollResult, myPlayer);
  });

  socket.on('player:ai_lore', ({ aiLore }) => {
    if (state.myPlayer) {
      state.myPlayer.lastAiLore = aiLore;
    }
    renderAiGmLoreBox(aiLore, true);
  });

  // ---------------------------------------------------------
  // DISTRICT / ROOM UPDATES
  // ---------------------------------------------------------
  socket.on('room:started', ({ room, roundInfo, roundActions }) => {
    setCurrentRoom(room);
    if (roundActions) setCurrentRoundActions(roundActions);
    if (state.myPlayer && room.players) {
      const me = room.players.find(p => p.id === state.myPlayer.id || p.socketId === socket.id);
      if (me) setMyPlayer(me);
    }
    showToast('🚀 รวมกลุ่มครบ 10 คนแล้ว! เริ่มต้นรอบที่ 1', 'success', 3500);
    playSound('fanfare');
    if (state.myPlayer) {
      renderPlayerView(state.myPlayer, room, roundInfo || room.currentRoundData, roundActions);
      if (window.goToPlayerStage) window.goToPlayerStage(1);
    }
  });

  socket.on('room:updated', ({ room, settlement, roundInfo, roundActions }) => {
    const prevRound = state.currentRoom ? state.currentRoom.round : null;
    setCurrentRoom(room);
    if (roundActions) setCurrentRoundActions(roundActions);

    if (state.myPlayer && room.players) {
      const me = room.players.find(p => p.id === state.myPlayer.id || p.socketId === socket.id);
      if (me) setMyPlayer(me);
    }

    // Critical UX: If round advanced to a new quarter, reset player view to Stage 1!
    if (prevRound !== null && room.round > prevRound && room.status === 'playing') {
      const chapter = roundInfo || room.currentRoundData;
      const chapterName = chapter ? chapter.chapterName : `รอบที่ ${room.round}`;
      showToast(`🚩 เริ่มต้นรอบที่ ${room.round}: ${chapterName}`, 'success', 4000);
      playSound('fanfare');
      onNewQuarterStarted(room.round);
    }

    if (state.isProjector) {
      renderProjectorView(room, roundInfo || room.currentRoundData);
    } else if (state.myPlayer) {
      renderPlayerView(state.myPlayer, room, roundInfo || room.currentRoundData, roundActions);
    }

    if (settlement && settlement.crisis) {
      showToast(settlement.crisis, 'danger', 6000);
      playSound('crisis');
    }
  });

  socket.on('room:player_disconnected', ({ playerId, name, message }) => {
    showToast(message || `⚠️ ${name} ขาดการเชื่อมต่อ`, 'warning', 4000);
    if (state.currentRoom && state.currentRoom.players) {
      const p = state.currentRoom.players.find(item => item.id === playerId);
      if (p) p.isDisconnected = true;
    }
    if (state.currentRoom && state.myPlayer) {
      updatePostRollWaitingState(state.currentRoom, state.myPlayer);
    }
  });

  socket.on('room:bot_takeover', ({ playerName, message }) => {
    showToast(message || `🤖 บอทเข้าช่วยเล่นแทนผู้เล่นที่หลุดการเชื่อมต่อเรียบร้อยแล้ว`, 'info', 4000);
    playSound('click');
  });

  socket.on('game_over', ({ room, finalEval }) => {
    sessionStorage.removeItem('dnd_player_session');
    playSound('fanfare');
    switchView('gameover');
    renderGameOverView(room, finalEval);
  });

  socket.on('join_error', (msg) => {
    showToast(msg || 'เกิดข้อผิดพลาดในการเข้าร่วมห้อง', 'danger');
    const btnJoin = document.getElementById('btn-join-room');
    if (btnJoin) {
      btnJoin.disabled = false;
      btnJoin.innerHTML = '<span>เข้าร่วมเล่นเกม</span> <span class="arrow">➜</span>';
    }
  });

  socket.on('player:kicked', ({ message }) => {
    sessionStorage.removeItem('dnd_player_session');
    setMyPlayer(null);
    setCurrentRoom(null);
    setCurrentRoomCode(null);

    // Close any open modals
    const modalReveal = document.getElementById('modal-character-reveal');
    if (modalReveal) modalReveal.classList.add('hidden');
    const modalParty = document.getElementById('modal-party-roster');
    if (modalParty) modalParty.classList.add('hidden');

    switchView('lobby');
    showToast(message || 'คุณถูกนำออกจากกลุ่มเรียบร้อยแล้ว', 'warning', 5000);
    playSound('crisis');
  });

  socket.on('master:action_error', ({ message }) => {
    showToast(message || 'เกิดข้อผิดพลาดในการดำเนินการ', 'danger', 4000);
    playSound('crisis');
  });

  // Security: Admin PIN Authentication Events
  socket.on('master:auth_success', ({ message }) => {
    sessionStorage.setItem('master_auth', 'true');
    showToast(message || 'ปลดล็อกแผงควบคุมระบบเรียบร้อยแล้ว!', 'success', 3000);
    playSound('fanfare');

    const modalAuth = document.getElementById('modal-admin-auth');
    if (modalAuth) modalAuth.classList.add('hidden');

    const authLabel = document.getElementById('master-auth-label');
    const btnAuth = document.getElementById('btn-master-auth');
    if (authLabel) authLabel.textContent = '🔓 ปลดล็อกแล้ว (Admin)';
    if (btnAuth) {
      btnAuth.style.borderColor = '#10b981';
      btnAuth.style.color = '#34d399';
    }

    // Enable all master command buttons
    ['btn-master-start', 'btn-master-global-settle', 'btn-master-advance-all'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = false;
    });
  });

  socket.on('master:auth_failed', ({ error }) => {
    showToast(error || 'รหัส Admin PIN ไม่ถูกต้อง', 'danger', 3500);
    const pinInput = document.getElementById('input-admin-pin');
    if (pinInput) {
      pinInput.value = '';
      pinInput.focus();
    }
  });

  socket.on('master:auth_required', ({ error }) => {
    showToast(error || 'จำเป็นต้องยืนยันรหัส Admin PIN ก่อน', 'warning', 3500);
    const modalAuth = document.getElementById('modal-admin-auth');
    if (modalAuth) modalAuth.classList.remove('hidden');
    const pinInput = document.getElementById('input-admin-pin');
    if (pinInput) pinInput.focus();
  });

  // Security: Roll & Rate Limit Errors
  socket.on('roll_error', (msg) => {
    showToast(`⚠️ ${msg}`, 'warning', 3500);
    handleRollError();
  });

  socket.on('rate_limit_error', (msg) => {
    showToast(`⏳ ${msg}`, 'warning', 3000);
  });
}
