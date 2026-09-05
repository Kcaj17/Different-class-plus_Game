/* =========================================================
   Inequality Tycoon: Projector (Host Screen) View Renderer
   ========================================================= */

export function renderProjectorView(room, roundData) {
  if (!room || !roundData) return;

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
  if (badgeEl) badgeEl.textContent = `📢 นโยบายรอบที่ ${room.round}: ${roundData.policyName || ''}`;

  const titleEl = document.getElementById('proj-policy-title');
  if (titleEl) titleEl.textContent = roundData.title;

  const descEl = document.getElementById('proj-policy-desc');
  if (descEl) descEl.textContent = roundData.description;

  const newsEl = document.getElementById('proj-policy-news');
  if (newsEl) newsEl.textContent = roundData.newsAlert;

  // Player Leaderboard Roster
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
}
