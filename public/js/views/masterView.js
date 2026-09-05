/* =========================================================
   masterView.js — National Command Center (200 Players / 20 Districts)
   Renders Master Screen, Live Roll Ticker, and District Inspector
   ========================================================= */

import { socket } from '../state.js';
import { playSound } from '../ui/audio.js';

let districtInspectorChart = null;

// Sidebar toggle controls
export function collapseMasterQrSidebar() {
  const sidebar = document.getElementById('master-qr-sidebar');
  const floatingTab = document.getElementById('btn-floating-qr-tab');
  if (sidebar) sidebar.classList.add('collapsed');
  if (floatingTab) floatingTab.classList.remove('hidden');
}

export function expandMasterQrSidebar() {
  const sidebar = document.getElementById('master-qr-sidebar');
  const floatingTab = document.getElementById('btn-floating-qr-tab');
  if (sidebar) sidebar.classList.remove('collapsed');
  if (floatingTab) floatingTab.classList.add('hidden');
}

export function toggleMasterQrSidebar() {
  const sidebar = document.getElementById('master-qr-sidebar');
  if (sidebar && sidebar.classList.contains('collapsed')) {
    expandMasterQrSidebar();
  } else {
    collapseMasterQrSidebar();
  }
}

// Update Master QR Code image and display URL
export function updateMasterQrCode(qrDataUrl, joinUrl) {
  const qrImg = document.getElementById('master-qr-img');
  const qrText = document.getElementById('master-qr-url-text');
  const modalImg = document.getElementById('master-qr-modal-img');
  const modalUrl = document.getElementById('master-qr-modal-url');

  if (qrText && joinUrl) {
    qrText.textContent = joinUrl;
    qrText.title = joinUrl;
  }
  if (modalUrl && joinUrl) {
    modalUrl.textContent = joinUrl;
  }

  const finalQrUrl = qrDataUrl || (joinUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(joinUrl)}` : '');

  if (qrImg && finalQrUrl) {
    qrImg.src = finalQrUrl;
  }
  if (modalImg && finalQrUrl) {
    modalImg.src = finalQrUrl;
  }
}

// Render Master Screen Dashboard
export function renderMasterScreen(aggregates, liveEvent = null, qrInfo = null) {
  if (!aggregates) return;

  // Render QR Code if provided
  if (qrInfo && (qrInfo.qrDataUrl || qrInfo.joinUrl)) {
    updateMasterQrCode(qrInfo.qrDataUrl, qrInfo.joinUrl);
  }

  // Update Player count badge on QR sidebar and modal
  const qrPlayerCount = document.getElementById('master-qr-player-count');
  const qrModalCount = document.getElementById('master-qr-modal-count');
  const totalCountText = `${aggregates.totalHumanCount || 0} คน (${aggregates.activeDistrictsCount || 0} กลุ่ม)`;
  if (qrPlayerCount) qrPlayerCount.textContent = totalCountText;
  if (qrModalCount) qrModalCount.textContent = totalCountText;

  // Auto-collapse QR sidebar once the game is active (round > 0)
  if (aggregates.round && aggregates.round > 0) {
    if (!sessionStorage.getItem('master_sidebar_collapsed_auto')) {
      sessionStorage.setItem('master_sidebar_collapsed_auto', 'true');
      collapseMasterQrSidebar();
    }
  }

  // 1. National Macro Indicators
  const macro = aggregates.nationalMacro || {};
  const totalPlayersEl = document.getElementById('master-total-players');
  const avgGiniEl = document.getElementById('master-avg-gini');
  const avgDebtEl = document.getElementById('master-avg-debt');
  const totalGdpEl = document.getElementById('master-total-gdp');
  const totalVatEl = document.getElementById('master-total-vat');
  const safeDistrictsEl = document.getElementById('master-safe-districts');

  if (totalPlayersEl) {
    const bots = Math.max(0, (aggregates.totalPlayersCount || 0) - (aggregates.totalHumanCount || 0));
    totalPlayersEl.innerHTML = `${aggregates.totalHumanCount || 0} คน <small style="color: #94a3b8; font-size: 0.75rem;">(${aggregates.activeDistrictsCount || 0} กลุ่ม${bots > 0 ? ` + 🤖${bots}` : ''})</small>`;
  }
  if (avgGiniEl) {
    avgGiniEl.textContent = macro.avgGini !== undefined ? macro.avgGini.toFixed(3) : '0.450';
  }
  if (avgDebtEl) {
    avgDebtEl.textContent = `${macro.avgDebtToGdp !== undefined ? macro.avgDebtToGdp.toFixed(1) : '62.0'}%`;
  }
  if (totalGdpEl) {
    totalGdpEl.textContent = `${(macro.totalGdp || 0).toLocaleString()} บ.`;
  }
  if (totalVatEl) {
    totalVatEl.textContent = `${(macro.totalVat || 0).toLocaleString()} บ.`;
  }
  if (safeDistrictsEl) {
    safeDistrictsEl.textContent = `${macro.safeDistrictsCount ?? 0} / ${aggregates.activeDistrictsCount || 0} กลุ่ม`;
  }

  // 2. Live Ticker Event
  if (liveEvent && liveEvent.message) {
    appendTickerEvent(liveEvent);
  }

  // Attach search input listener once
  const searchInput = document.getElementById('master-search-districts');
  if (searchInput && !searchInput._listenerAttached) {
    searchInput._listenerAttached = true;
    searchInput.addEventListener('input', () => {
      if (window._lastMasterAggregates) {
        renderMasterScreen(window._lastMasterAggregates);
      }
    });
  }
  window._lastMasterAggregates = aggregates;

  // 3. Render Districts Grid with search filtering
  const gridContainer = document.getElementById('master-districts-grid');
  if (gridContainer && aggregates.districtsSummary) {
    let districts = aggregates.districtsSummary;
    const query = (searchInput ? searchInput.value : '').trim().toUpperCase();
    if (query) {
      districts = districts.filter(d => (d.code || '').toUpperCase().includes(query) || (d.name || '').toUpperCase().includes(query));
    }

    if (districts.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px 20px; text-align: center; color: #94a3b8; font-size: 0.95rem;">
          ${query ? `🔍 ไม่พบกลุ่มที่ตรงกับคำค้นหา "${query}"` : '⏳ ยังไม่มีกลุ่มเศรษฐกิจเข้าร่วมในระบบ (รอผู้เล่นสแกน QR Code หรือกดสุ่มกลุ่ม)'}
        </div>
      `;
    } else {
      gridContainer.innerHTML = districts.map(d => {
        if (d.isClosed) {
          return `
            <div class="district-card glass-card district-closed" data-code="${d.code}" style="opacity: 0.45; filter: grayscale(0.5);">
              <div class="district-card-header">
                <div class="district-name-badge">
                  <span class="district-num">#${d.districtIndex}</span>
                  <strong>${d.name}</strong>
                </div>
                <span class="round-pill" style="background: rgba(148, 163, 184, 0.2); color: #94a3b8;">🔒 ปิดทำการ</span>
              </div>
              <div style="padding: 24px 0; text-align: center; color: #94a3b8; font-size: 0.85rem;">
                <span>ไม่มีผู้เล่นคนจริงในเขตนี้ (ปิดการประมวลผล)</span>
              </div>
            </div>
          `;
        }

        const isCrisis = d.hasCrisis;
        const giniColor = d.gini < 0.35 ? '#10b981' : (d.gini <= 0.50 ? '#f59e0b' : '#ef4444');
        const debtColor = d.debtToGdp < 60 ? '#10b981' : (d.debtToGdp < 67 ? '#f59e0b' : '#ef4444');
        const botCount = Math.max(0, (d.totalPlayers || 10) - d.humanPlayers);

        return `
          <div class="district-card glass-card ${isCrisis ? 'crisis-glow' : ''}" data-code="${d.code}">
            <div class="district-card-header">
              <div class="district-name-badge">
                <span class="district-num">#${d.districtIndex}</span>
                <strong>${d.name}</strong>
              </div>
              <span class="round-pill">รอบ ${d.round}/${d.maxRounds}</span>
            </div>

            <div class="district-stats-row">
              <div class="stat-box">
                <span class="stat-label">ผู้เล่น</span>
                <strong class="stat-val">${d.humanPlayers} ${botCount > 0 ? `<small style="color: #38bdf8;">+🤖${botCount}</small>` : ''}</strong>
              </div>
              <div class="stat-box">
                <span class="stat-label">Gini</span>
                <strong class="stat-val" style="color: ${giniColor};">${d.gini.toFixed(3)}</strong>
              </div>
              <div class="stat-box">
                <span class="stat-label">หนี้/GDP</span>
                <strong class="stat-val" style="color: ${debtColor};">${d.debtToGdp}%</strong>
              </div>
              <div class="stat-box">
                <span class="stat-label">สุขภาวะเฉลี่ย</span>
                <strong class="stat-val text-qol">${d.avgQol}%</strong>
              </div>
            </div>

            ${isCrisis ? `<div class="district-crisis-tag">🚨 ${d.crisisAlert || 'เกิดวิกฤตเศรษฐกิจ!'}</div>` : ''}

            <div class="district-card-footer">
              <button class="btn-inspect-district" onclick="window.inspectDistrict('${d.code}')">
                <span>🔍 ดูรายละเอียดกลุ่มนี้</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 4. Philosophy Leaderboard
  const leader = aggregates.leaderboard || {};
  const elEqual = document.getElementById('lb-equal-district');
  const elHappy = document.getElementById('lb-happy-district');
  const elDebt = document.getElementById('lb-prudent-district');

  if (elEqual && leader.mostEqualDistrict) {
    elEqual.textContent = `${leader.mostEqualDistrict.name} (Gini ${leader.mostEqualDistrict.gini.toFixed(3)})`;
  }
  if (elHappy && leader.highestHappinessDistrict) {
    elHappy.textContent = `${leader.highestHappinessDistrict.name} (สุขภาวะเฉลี่ย ${leader.highestHappinessDistrict.avgQol}%)`;
  }
  if (elDebt && leader.fiscallyPrudentDistrict) {
    elDebt.textContent = `${leader.fiscallyPrudentDistrict.name} (${leader.fiscallyPrudentDistrict.debtToGdp}%)`;
  }
}

// Append new event to the live roll ticker
function appendTickerEvent(event) {
  const ticker = document.getElementById('master-live-ticker-list');
  if (!ticker) return;

  const item = document.createElement('div');
  item.className = `ticker-item ticker-${event.type || 'normal'}`;
  item.innerHTML = `
    <span class="ticker-time">${new Date().toLocaleTimeString('th-TH')}</span>
    <span class="ticker-msg">${event.message}</span>
  `;

  ticker.insertBefore(item, ticker.firstChild);

  // Keep max 12 items so the stream fills the frame nicely
  while (ticker.children.length > 12) {
    ticker.removeChild(ticker.lastChild);
  }

  // Sound effects
  if (event.type === 'nat20') playSound('fanfare');
  else if (event.type === 'nat1') playSound('crisis');
}

// Open District Inspector Modal
export function openDistrictInspector(data) {
  const modal = document.getElementById('modal-district-inspector');
  if (!modal || !data || !data.room) return;

  const room = data.room;
  const eco = data.eco || {};
  const roundInfo = data.roundInfo || {};

  document.getElementById('inspector-district-title').textContent = `${room.districtName} (${room.code})`;
  document.getElementById('inspector-round-subtitle').textContent = `รอบที่ ${room.round} / ${room.maxRounds} • ${roundInfo.chapterName || ''}`;

  // Macro metrics
  document.getElementById('inspector-gini').textContent = room.macroStats.gini.toFixed(3);
  document.getElementById('inspector-debt').textContent = `${room.macroStats.debtToGdp.toFixed(1)}%`;
  document.getElementById('inspector-gdp').textContent = `${room.macroStats.gdp.toLocaleString()} บ.`;
  document.getElementById('inspector-vat').textContent = `${Math.round(room.macroStats.totalVatCollected).toLocaleString()} บ.`;

  // Render Roster of 10 characters
  const rosterContainer = document.getElementById('inspector-roster-list');
  if (rosterContainer && room.players) {
    rosterContainer.innerHTML = room.players.map((p, idx) => `
      <div class="inspector-player-item ${p.isBot ? 'bot-item' : ''}" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div class="player-left" style="flex: 1; min-width: 0;">
          <span class="player-avatar">${p.avatar || '👤'}</span>
          <div>
            <div class="player-name">
              ${idx + 1}. ${p.name}
              ${p.isBot ? '<small class="bot-badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 4px;">🤖 บอท</small>' : ''}
              ${p.isDisconnected ? '<small class="offline-badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 4px;">⚠️ ขาดการเชื่อมต่อ</small>' : ''}
            </div>
            <small class="player-sub">${p.className || p.subTitle || ''}</small>
          </div>
        </div>
        <div class="player-stats-mini">
          <span>สุขภาวะ: <strong>${p.qol}%</strong></span>
          <span>เงิน: <strong>${Math.round(p.cash).toLocaleString()} บ.</strong></span>
          <span>หนี้: <strong>${Math.round(p.debt).toLocaleString()} บ.</strong></span>
        </div>
        <div class="player-last-action" style="min-width: 130px; font-size: 0.78rem;">
          ${p.lastActionDesc ? `🎲 <em>${p.lastActionDesc}</em>` : '<span class="text-muted">กำลังเตรียมตัดสินใจ...</span>'}
        </div>
        ${!p.isBot ? `
          <button class="btn-kick-player btn-secondary" data-room-code="${room.code}" data-player-id="${p.id}" data-player-name="${p.name}" style="padding: 4px 10px; font-size: 0.78rem; background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; cursor: pointer; border-radius: 6px; white-space: nowrap; transition: all 0.2s;" title="เตะผู้เล่นคนนี้">
            🚫 เตะ
          </button>
        ` : ''}
      </div>
    `).join('');

    // Attach click listeners to all kick buttons
    rosterContainer.querySelectorAll('.btn-kick-player').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const rCode = btn.dataset.roomCode;
        const pId = btn.dataset.playerId;
        const pName = btn.dataset.playerName;

        if (sessionStorage.getItem('master_auth') !== 'true') {
          const modalAuth = document.getElementById('modal-admin-auth');
          if (modalAuth) modalAuth.classList.remove('hidden');
          return;
        }

        if (confirm(`คุณต้องการเตะผู้เล่น "${pName}" ออกจากกลุ่ม ${rCode} หรือไม่?`)) {
          playSound('click');
          if (socket) {
            socket.emit('master:kick_player', { roomCode: rCode, playerId: pId });
          }
        }
      };
    });
  }

  // Bind Reset District Button
  const btnResetDistrict = document.getElementById('btn-inspector-reset-district');
  if (btnResetDistrict) {
    btnResetDistrict.onclick = () => {
      if (sessionStorage.getItem('master_auth') !== 'true') {
        const modalAuth = document.getElementById('modal-admin-auth');
        if (modalAuth) modalAuth.classList.remove('hidden');
        return;
      }

      if (confirm(`⚠️ ยืนยันการรีเซ็ตกลุ่ม ${room.districtName} (${room.code}) หรือไม่?\n\nผู้เล่นทั้งหมดในกลุ่มนี้จะถูกส่งกลับหน้า Lobby และกลุ่มจะถูกล้างข้อมูลกลับสู่รอบที่ 1`)) {
        playSound('click');
        if (socket) {
          socket.emit('master:reset_district', { roomCode: room.code });
        }
      }
    };
  }

  // Render Inspector Lorenz Chart
  renderInspectorChart(eco.lorenzPoints || []);

  modal.classList.remove('hidden');
}

// Render Inspector Lorenz Chart
function renderInspectorChart(lorenzPoints) {
  const canvas = document.getElementById('inspectorLorenzCanvas');
  if (!canvas) return;

  if (districtInspectorChart) {
    districtInspectorChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  districtInspectorChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'เส้นความเท่าเทียมสมบูรณ์ (45°)',
          data: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
          borderColor: 'rgba(255, 255, 255, 0.4)',
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false
        },
        {
          label: 'เส้นโค้งลอเรนซ์ของเขตนี้',
          data: lorenzPoints,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          borderWidth: 2.5,
          pointBackgroundColor: '#10b981',
          pointRadius: 3,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 100,
          title: { display: true, text: '% ประชากรสะสม', color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          min: 0,
          max: 100,
          title: { display: true, text: '% ทรัพย์สินสะสม', color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#f8fafc', font: { family: 'Kanit' } }
        }
      }
    }
  });
}

// Global hook for inspect button
window.inspectDistrict = function(districtCode) {
  playSound('click');
  if (socket) {
    socket.emit('master:request_district_details', { districtCode });
  }
};
