/* =========================================================
   masterView.js — National Command Center (200 Players / 20 Districts)
   Renders Master Screen, Live Roll Ticker, and District Inspector
   ========================================================= */

import { socket } from '../state.js';
import { playSound } from '../ui/audio.js';

let districtInspectorChart = null;

// Update Master QR Code image and display URL
export function updateMasterQrCode(qrDataUrl, joinUrl) {
  const qrImg = document.getElementById('master-qr-img');
  const qrText = document.getElementById('master-qr-url-text');

  if (qrText && joinUrl) {
    qrText.textContent = joinUrl;
    qrText.title = joinUrl;
  }

  if (qrImg) {
    if (qrDataUrl) {
      qrImg.src = qrDataUrl;
    } else if (joinUrl) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(joinUrl)}`;
    }
  }
}

// Render Master Screen Dashboard
export function renderMasterScreen(aggregates, liveEvent = null, qrInfo = null) {
  if (!aggregates) return;

  // Render QR Code if provided
  if (qrInfo && (qrInfo.qrDataUrl || qrInfo.joinUrl)) {
    updateMasterQrCode(qrInfo.qrDataUrl, qrInfo.joinUrl);
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
    totalPlayersEl.textContent = `${aggregates.totalPlayersCount} / 200 คน`;
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
    safeDistrictsEl.textContent = `${macro.safeDistrictsCount || 20} / 20 เขต`;
  }

  // 2. Live Ticker Event
  if (liveEvent && liveEvent.message) {
    appendTickerEvent(liveEvent);
  }

  // 3. Render 20 Districts Grid
  const gridContainer = document.getElementById('master-districts-grid');
  if (gridContainer && aggregates.districtsSummary) {
    gridContainer.innerHTML = aggregates.districtsSummary.map(d => {
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

  // Keep max 8 items
  while (ticker.children.length > 8) {
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
      <div class="inspector-player-item ${p.isBot ? 'bot-item' : ''}">
        <div class="player-left">
          <span class="player-avatar">${p.avatar || '👤'}</span>
          <div>
            <div class="player-name">
              ${idx + 1}. ${p.name}
              ${p.isBot ? '<small class="bot-badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 4px;">🤖 บอท</small>' : ''}
              ${p.isDisconnected ? '<small class="offline-badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 4px;">⚠️ ขาดการเชื่อมต่อ</small>' : ''}
            </div>
            <small class="player-sub">${p.className || p.subTitle}</small>
          </div>
        </div>
        <div class="player-stats-mini">
          <span>สุขภาวะ: <strong>${p.qol}%</strong></span>
          <span>เงิน: <strong>${Math.round(p.cash).toLocaleString()} บ.</strong></span>
          <span>หนี้: <strong>${Math.round(p.debt).toLocaleString()} บ.</strong></span>
        </div>
        <div class="player-last-action">
          ${p.lastActionDesc ? `🎲 <em>${p.lastActionDesc}</em>` : '<span class="text-muted">กำลังเตรียมตัดสินใจและทอยเต๋า...</span>'}
        </div>
      </div>
    `).join('');
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
