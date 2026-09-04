/* =========================================================
   Inequality Tycoon: Lorenz Curve Chart Module (Chart.js)
   ========================================================= */

import { state } from '../state.js';

export function initLorenzChart() {
  const canvas = document.getElementById('lorenzChartCanvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
  gradient.addColorStop(1, 'rgba(245, 158, 11, 0.02)');

  state.lorenzChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'เส้นความเท่าเทียมสมบูรณ์ (Line of Equality 45°)',
          data: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
          borderColor: 'rgba(59, 130, 246, 0.85)',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          fill: false,
          tension: 0
        },
        {
          label: 'เส้นโค้งลอเรนซ์จริง (Actual Lorenz Curve)',
          data: [{ x: 0, y: 0 }, { x: 10, y: 1 }, { x: 40, y: 8 }, { x: 70, y: 22 }, { x: 100, y: 100 }],
          borderColor: '#f59e0b',
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#f59e0b',
          pointHoverRadius: 6,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 100,
          title: {
            display: true,
            text: '% สะสมของประชากร (Cumulative % of Population)',
            color: '#94a3b8',
            font: { family: 'Prompt', size: 11 }
          },
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { color: '#94a3b8', callback: v => v + '%' }
        },
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: '% สะสมของความมั่งคั่ง (Cumulative % of Wealth)',
            color: '#94a3b8',
            font: { family: 'Prompt', size: 11 }
          },
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { color: '#94a3b8', callback: v => v + '%' }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#f8fafc',
            font: { family: 'Prompt', size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `ประชากร ${ctx.parsed.x}% ครองความมั่งคั่ง ${ctx.parsed.y}%`
          }
        }
      }
    }
  });
}

export function updateLorenzChart(points) {
  if (!state.lorenzChart || !points) return;
  state.lorenzChart.data.datasets[1].data = points;
  state.lorenzChart.update();
}

export function initFinalLorenzChart(points) {
  const canvas = document.getElementById('finalLorenzChart');
  if (!canvas || !points || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  if (state.finalLorenzChart) {
    state.finalLorenzChart.destroy();
  }

  state.finalLorenzChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'เส้นความเท่าเทียม (45°)',
          data: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
          borderColor: 'rgba(59, 130, 246, 0.7)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'เส้นโค้งลอเรนซ์สุดท้าย',
          data: points,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.25)',
          fill: true,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { min: 0, max: 100, ticks: { color: '#94a3b8' } },
        y: { min: 0, max: 100, ticks: { color: '#94a3b8' } }
      },
      plugins: {
        legend: { labels: { color: '#f8fafc', font: { family: 'Prompt' } } }
      }
    }
  });
}
