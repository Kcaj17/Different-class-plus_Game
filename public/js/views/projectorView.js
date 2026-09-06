/* =========================================================
   Inequality Tycoon: Projector (Host Screen) View Renderer
   ========================================================= */

export function renderProjectorView(room, roundData) {
  if (!room) return;
  const roundInfo = roundData || room.currentRoundData || {};

  // Macro Bar
  const roundIndicator = document.getElementById('proj-round-indicator');
  if (roundIndicator) {
    roundIndicator.textContent = `รอบที่ ${room.round} / ${room.maxRounds}`;
  }

  const gdpEl = document.getElementById('proj-gdp');
  if (gdpEl && room.macroStats) {
    gdpEl.textContent = room.macroStats.gdp.toLocaleString() + ' บาท';
  }
  
  if (room.macroStats) {
    const debt = Number(room.macroStats.debtToGdp.toFixed(1));
    const debtEl = document.getElementById('proj-debt');
    if (debtEl) {
      debtEl.innerHTML = `${debt}% <small style="font-size: 0.75rem; color: #f87171;">(เพดาน 70%)</small>`;
    }

    const debtBar = document.getElementById('proj-debt-bar');
    if (debtBar) {
      debtBar.style.width = Math.min(100, (debt / 70) * 100) + '%';
      if (debt >= 67.0) {
        debtBar.classList.add('danger');
      } else {
        debtBar.classList.remove('danger');
      }
    }

    const gini = room.macroStats.gini;
    const giniEl = document.getElementById('proj-gini');
    if (giniEl) giniEl.textContent = gini.toFixed(3);

    const giniText = document.getElementById('proj-gini-text');
    if (giniText) {
      if (gini < 0.35) {
        giniText.textContent = 'ความเหลื่อมล้ำต่ำ (กระจายรายได้ดี)';
        giniText.style.color = '#10b981';
      } else if (gini <= 0.50) {
        giniText.textContent = 'ความเหลื่อมล้ำปานกลาง';
        giniText.style.color = '#f59e0b';
      } else {
        giniText.textContent = 'ความเหลื่อมล้ำสูงมาก!';
        giniText.style.color = '#ef4444';
      }
    }

    const vatEl = document.getElementById('proj-vat');
    if (vatEl) {
      vatEl.textContent = Math.round(room.macroStats.totalVatCollected).toLocaleString() + ' บาท';
    }
  }

  // Policy Flash
  const badgeEl = document.getElementById('proj-policy-badge');
  if (badgeEl) badgeEl.textContent = `📢 ${roundInfo.themeBadge || `นโยบายรอบที่ ${room.round}: ${roundInfo.policyName || roundInfo.chapterName || ''}`}`;

  const titleEl = document.getElementById('proj-policy-title');
  if (titleEl) titleEl.textContent = roundInfo.chapterName || roundInfo.title || roundInfo.subTitle || `รอบที่ ${room.round}`;

  const descEl = document.getElementById('proj-policy-desc');
  if (descEl) descEl.textContent = roundInfo.lore || roundInfo.description || '';

  const newsEl = document.getElementById('proj-policy-news');
  if (newsEl) newsEl.textContent = roundInfo.newsAlert || '';

  // Player Leaderboard Roster
  const countBadgeEl = document.getElementById('proj-player-count-badge');
  if (countBadgeEl && room.players) {
    countBadgeEl.textContent = `${room.players.length} คนในเขต`;
  }

  const rosterContainer = document.getElementById('proj-player-list');
  if (rosterContainer && room.players) {
    const sorted = [...room.players].sort((a, b) => 
      (Math.max(0, b.cash + (b.businessValue || 0) - (b.debt || 0))) - 
      (Math.max(0, a.cash + (a.businessValue || 0) - (a.debt || 0)))
    );
    rosterContainer.innerHTML = sorted.map((p, rank) => {
      const netWealth = Math.max(0, p.cash + (p.businessValue || 0) - (p.debt || 0));
      return `
        <div class="mini-roster-item">
          <div class="player-title">
            <span>${p.avatar || '👤'}</span>
            <strong>${rank + 1}. ${p.name}</strong>
          </div>
          <div class="player-wealth">
            ${Math.round(netWealth).toLocaleString()} บ.
          </div>
        </div>
      `;
    }).join('');
  }

  // Dynamic Lorenz curve on projector screen if canvas and Chart.js are available
  const lorenzCanvas = document.getElementById('chart-lorenz-proj');
  if (lorenzCanvas && typeof Chart !== 'undefined' && room.players && room.players.length > 0) {
    try {
      if (!window._projLorenzChart) {
        const ctx = lorenzCanvas.getContext('2d');
        window._projLorenzChart = new Chart(ctx, {
          type: 'line',
          data: {
            datasets: [
              {
                label: 'เส้นความเท่าเทียม (45°)',
                data: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
                borderColor: 'rgba(59, 130, 246, 0.7)',
                borderDash: [5, 5],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false
              },
              {
                label: 'เส้นโค้งลอเรนซ์จริง',
                data: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                borderWidth: 2.5,
                fill: true,
                pointRadius: 3,
                tension: 0.3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { min: 0, max: 100, ticks: { color: '#94a3b8' } },
              y: { min: 0, max: 100, ticks: { color: '#94a3b8' } }
            }
          }
        });
      }
      const wealths = room.players.map(p => Math.max(0, (p.cash || 0) + (p.businessValue || 0) - (p.debt || 0))).sort((a, b) => a - b);
      const totalW = wealths.reduce((s, w) => s + w, 0);
      const points = [{ x: 0, y: 0 }];
      if (totalW > 0) {
        let cumW = 0;
        wealths.forEach((w, i) => {
          cumW += w;
          points.push({
            x: Math.round(((i + 1) / wealths.length) * 100),
            y: Number(((cumW / totalW) * 100).toFixed(1))
          });
        });
      } else {
        points.push({ x: 100, y: 100 });
      }
      if (window._projLorenzChart && window._projLorenzChart.data && window._projLorenzChart.data.datasets[1]) {
        window._projLorenzChart.data.datasets[1].data = points;
        window._projLorenzChart.update();
      }
    } catch (e) {
      // Graceful fallback for headless or non-canvas test environments
    }
  }
}
