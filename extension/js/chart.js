import { LABELS, LABEL_ORDER } from '../config.js';

let sentimentChartInstance = null;
let trendChartInstance = null;

function destroyChart(instance) {
  if (instance) {
    instance.destroy();
  }
}

export function renderSentimentChart(summary = {}) {
  const canvas = document.getElementById('sentimentChart');
  if (!canvas) return;

  destroyChart(sentimentChartInstance);

  const ctx = canvas.getContext('2d');
  const labels = LABEL_ORDER.map((label) => LABELS[label].name);
  const colors = LABEL_ORDER.map((label) => LABELS[label].color);
  const data = LABEL_ORDER.map((label) => summary[label] || 0);

  sentimentChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            usePointStyle: true,
            padding: 14,
          },
        },
      },
      cutout: '62%',
    },
  });
}

export function renderTrendChart(series = []) {
  const canvas = document.getElementById('weeklyTrendChart');
  if (!canvas) return;

  destroyChart(trendChartInstance);

  const ctx = canvas.getContext('2d');

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: series.map((entry) => entry.label),
      datasets: [
        {
          label: 'Average exposure',
          data: series.map((entry) => entry.averageRisk),
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.18)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 4,
        },
        {
          label: 'High-risk share',
          data: series.map((entry) => entry.highRiskShare),
          borderColor: '#fb7185',
          backgroundColor: 'rgba(251, 113, 133, 0.14)',
          fill: false,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 1,
          ticks: {
            callback(value) {
              return `${Math.round(value * 100)}%`;
            },
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.16)',
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            usePointStyle: true,
            padding: 14,
          },
        },
      },
    },
  });
}
