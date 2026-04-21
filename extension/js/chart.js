import { SIGNAL_MAP } from '../config.js';

let chartInstance = null;

export function renderChart(signalPrevalence = []) {
  const chartContainer = document.querySelector('.chart-container');
  if (!chartContainer) return;

  const existingCanvas = document.getElementById('signalChart');
  if (existingCanvas) {
    existingCanvas.remove();
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'signalChart';
  chartContainer.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const rows = signalPrevalence
    .filter((row) => row.key !== 'no_clear_signal')
    .sort((a, b) => b.mean_score - a.mean_score);
  const labelNames = rows.map(
    (row) => SIGNAL_MAP[row.key]?.shortName || row.display_name
  );
  const colors = rows.map((row) => SIGNAL_MAP[row.key]?.color || '#6b7280');
  const data = rows.map((row) => Number((row.mean_score * 100).toFixed(2)));

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labelNames,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderRadius: 999,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.raw}% mean signal score`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(32, 53, 82, 0.08)',
          },
          ticks: {
            callback(value) {
              return `${value}%`;
            },
          },
        },
        y: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
}
