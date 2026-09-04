/* =========================================================
   Inequality Tycoon: Lobby View Renderer
   ========================================================= */

export function renderLobbyRoster(room) {
  const rosterGrid = document.getElementById('roster-grid');
  const countBadge = document.getElementById('player-count-badge');
  if (!rosterGrid || !room) return;

  const humanCount = room.players.filter(p => !p.isBot).length;
  countBadge.textContent = `ผู้เล่นจริง: ${humanCount} คน (ระบบจะเติม AI บอทให้ครบ 10 คน)`;

  rosterGrid.innerHTML = '';
  // Show up to 10 slots
  const displayList = [...room.players];
  while (displayList.length < 10) {
    displayList.push({
      name: 'รอผู้เล่นหรือ AI บอท',
      avatar: '⏳',
      subTitle: 'กำลังเตรียมบทบาท...'
    });
  }

  displayList.slice(0, 10).forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'roster-item';
    item.innerHTML = `
      <div class="roster-avatar">${p.avatar || '👤'}</div>
      <div class="roster-info">
        <strong>${p.name}</strong>
        <small>${p.subTitle || 'ตำแหน่งที่ ' + (idx + 1)}</small>
      </div>
    `;
    rosterGrid.appendChild(item);
  });
}
