/* =========================================================
   Inequality Tycoon: Game Over View & Evaluation Renderer
   ========================================================= */

import { initFinalLorenzChart } from '../charts/lorenzChart.js';

export function renderGameOverView(summary) {
  if (!summary) return;

  const icon = document.getElementById('go-icon');
  const title = document.getElementById('go-title');
  const desc = document.getElementById('go-desc');

  if (summary.isCountrySaved) {
    if (icon) icon.textContent = '🎉';
    if (title) title.textContent = 'ภารกิจสำเร็จ: สังคมรอดพ้นวิกฤตและรักษาวินัยการคลังได้!';
    if (desc) desc.textContent = `ระบบเศรษฐกิจผ่านพ้น 6 ไตรมาส หนี้สาธารณะคงอยู่ที่ ${summary.finalDebtToGdp}% (ต่ำกว่าเพดาน 70%) และดัชนีจีนีอยู่ที่ ${summary.finalGini}`;
  } else {
    if (icon) icon.textContent = '🚨';
    if (title) title.textContent = 'วิกฤตเศรษฐกิจ: เกิดความไม่สมดุลทางการคลังหรือความเหลื่อมล้ำ!';
    if (desc) desc.textContent = `ประเทศเผชิญข้อจำกัดทางเศรษฐกิจ หนี้สาธารณะหรือความเหลื่อมล้ำแตะระดับวิกฤต`;
  }

  const giniEl = document.getElementById('go-gini');
  if (giniEl) giniEl.textContent = summary.finalGini.toFixed(3);

  const debtEl = document.getElementById('go-debt');
  if (debtEl) debtEl.textContent = summary.finalDebtToGdp + '%';

  const gdpEl = document.getElementById('go-gdp');
  if (gdpEl) gdpEl.textContent = summary.totalGdp.toLocaleString() + ' บาท';

  // Philosophy Awards
  const utilEl = document.getElementById('go-utilitarian-text');
  if (utilEl && summary.philosophyAwards?.utilitarian) {
    utilEl.textContent = summary.philosophyAwards.utilitarian.summary;
  }

  const rawlsEl = document.getElementById('go-rawlsian-text');
  if (rawlsEl && summary.philosophyAwards?.rawlsian) {
    rawlsEl.textContent = summary.philosophyAwards.rawlsian.summary;
  }

  const oppEl = document.getElementById('go-opportunity-text');
  if (oppEl && summary.philosophyAwards?.opportunity) {
    oppEl.textContent = summary.philosophyAwards.opportunity.summary;
  }

  // Role Winners
  const winnersContainer = document.getElementById('go-role-winners');
  if (winnersContainer && summary.roleWinners) {
    winnersContainer.innerHTML = `
      <div class="role-win-item">
        <strong>🏢 เจ้าสัวยอดเยี่ยม:</strong>
        <div>${summary.roleWinners.capitalist ? summary.roleWinners.capitalist.name : '-'}</div>
        <small>${summary.roleWinners.capitalist ? summary.roleWinners.capitalist.score : ''}</small>
      </div>
      <div class="role-win-item">
        <strong>🏪 ร้านค้ายอดขายสูงสุด:</strong>
        <div>${summary.roleWinners.sme ? summary.roleWinners.sme.name : '-'}</div>
        <small>${summary.roleWinners.sme ? summary.roleWinners.sme.score : ''}</small>
      </div>
      <div class="role-win-item">
        <strong>👔 พลเมืองคุณภาพชีวิตดีเด่น:</strong>
        <div>${summary.roleWinners.citizen ? summary.roleWinners.citizen.name : '-'}</div>
        <small>${summary.roleWinners.citizen ? summary.roleWinners.citizen.score : ''}</small>
      </div>
      <div class="role-win-item">
        <strong>👵 รางวัลหลุดพ้นความยากจน:</strong>
        <div>${summary.roleWinners.vulnerable ? summary.roleWinners.vulnerable.name : '-'}</div>
        <small>${summary.roleWinners.vulnerable ? summary.roleWinners.vulnerable.score : ''}</small>
      </div>
    `;
  }

  // Render Final Lorenz Chart
  initFinalLorenzChart(summary.lorenzPoints);
}
