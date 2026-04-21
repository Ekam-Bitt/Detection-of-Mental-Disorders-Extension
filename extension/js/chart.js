import { LABELS, LABEL_ORDER } from '../config.js';

let chartInstance = null;

export function renderChart(summary) {
  const chartContainer = document.querySelector('.chart-container');
  if (!chartContainer) return;

  // Destroy existing chart instance first
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  // Clear the entire container (removes loader, old canvases, everything)
  chartContainer.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.id = 'sentimentChart';
  chartContainer.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const labelNames = LABEL_ORDER.map((label) => LABELS[label].name);
  const colors = LABEL_ORDER.map((label) => LABELS[label].color);
  const data = LABEL_ORDER.map((label) => summary[label] || 0);

  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labelNames,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: {
              size: 12,
            },
            padding: 15,
          },
        },
      },
    },
  });
}
