import { LABELS, LABEL_ORDER } from '../config.js';
import { describeRisk } from './analysis.js';
import { renderSentimentChart, renderTrendChart } from './chart.js';
import { isShielded } from './shield.js';

const element = (selector) => document.querySelector(selector);
const elements = (selector) => Array.from(document.querySelectorAll(selector));

export function setActiveView(view) {
  elements('[data-view-toggle]').forEach((button) => {
    button.classList.toggle('active', button.dataset.viewToggle === view);
  });

  element('#dashboardView')?.classList.toggle('hidden', view !== 'dashboard');
  element('#analysisView')?.classList.toggle('hidden', view !== 'analysis');
}

export function showAnalysisLoader(text) {
  const status = element('#analysisStatus');
  if (status) {
    status.textContent = text;
    status.classList.remove('hidden');
  }

  element('#pageChartPanel')?.classList.remove('hidden');
  const chartBody = element('#pageChartPanel .panel-body');
  if (chartBody) {
    chartBody.innerHTML = `
      <div class="loader">
        <img src="icons/spinner.gif" class="loader-gif" alt="Loading" />
        <div class="loader-text">${text}</div>
      </div>
    `;
  }
}

export function hideAnalysisLoader() {
  const status = element('#analysisStatus');
  if (status) {
    status.classList.add('hidden');
  }

  const chartBody = element('#pageChartPanel .panel-body');
  if (chartBody) {
    chartBody.innerHTML = '<canvas id="sentimentChart"></canvas>';
  }
}

export function renderDashboard(dashboard) {
  setText('#weeklyHighRiskValue', `${Math.round(dashboard.highRiskShare * 100)}%`);
  setText('#weeklyAvgRiskValue', `${Math.round(dashboard.averageRisk * 100)}%`);
  setText(
    '#weeklyVolatilityValue',
    dashboard.volatility.flagged ? 'Elevated' : 'Stable'
  );
  setText('#trackedTimeValue', `${dashboard.totalMinutes} min`);
  setText('#dashboardInsight', dashboard.insight);

  const updatedAt = dashboard.lastUpdated
    ? new Date(dashboard.lastUpdated).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'No data yet';
  setText('#dashboardUpdatedAt', `Updated ${updatedAt}`);

  renderDietBreakdown(dashboard);
  renderTrendChart(dashboard.dailySeries);
}

function renderDietBreakdown(dashboard) {
  const calm = Math.round(dashboard.calmShare * 100);
  const guarded = Math.round(dashboard.guardedShare * 100);
  const intense = Math.round(dashboard.intenseShare * 100);

  setText('#dietCalmValue', `${calm}%`);
  setText('#dietGuardedValue', `${guarded}%`);
  setText('#dietIntenseValue', `${intense}%`);

  const calmBar = element('#dietCalmBar');
  const guardedBar = element('#dietGuardedBar');
  const intenseBar = element('#dietIntenseBar');

  if (calmBar) calmBar.style.width = `${calm}%`;
  if (guardedBar) guardedBar.style.width = `${guarded}%`;
  if (intenseBar) intenseBar.style.width = `${intense}%`;
}

export function syncSettings(settings) {
  const shieldMode = element('#shieldMode');
  const thresholdSlider = element('#thresholdSlider');
  const thresholdValue = element('#thresholdValue');
  const nudgesToggle = element('#nudgesToggle');
  const resourceToggle = element('#resourceToggle');

  if (shieldMode) shieldMode.checked = settings.shieldEnabled;
  if (thresholdSlider)
    thresholdSlider.value = Math.round(settings.shieldThreshold * 100);
  if (thresholdValue) {
    thresholdValue.textContent = `${Math.round(settings.shieldThreshold * 100)}%`;
  }
  if (nudgesToggle) nudgesToggle.checked = settings.nudgesEnabled;
  if (resourceToggle) resourceToggle.checked = settings.resourcePromptsEnabled;
}

export function renderAnalysis(metrics, topComments, activeFilter, settings) {
  renderPageMetricCards(metrics);
  renderSummary(metrics.summary);
  hideAnalysisLoader();
  renderSentimentChart(metrics.summary);
  element('#filterContainer')?.classList.remove('hidden');
  element('#pageSummary')?.classList.remove('hidden');
  displayResults(
    getFilteredResults(metrics.results, activeFilter),
    topComments,
    activeFilter,
    settings
  );
  setActiveFilter(activeFilter);
}

function renderPageMetricCards(metrics) {
  setText('#pageRiskValue', `${Math.round(metrics.averageRisk * 100)}%`);
  setText('#pageHighRiskValue', `${Math.round(metrics.toxicRatio * 100)}%`);
  setText(
    '#pageVolatilityValue',
    metrics.volatility.flagged
      ? `${Math.round(metrics.volatility.maxSwing * 100)} pt swing`
      : 'Steady'
  );

  setText(
    '#pageRiskDetail',
    `${describeRisk(metrics.averageRisk)} exposure across ${
      metrics.totalComments
    } comments`
  );
  setText(
    '#pageHighRiskDetail',
    `${metrics.highRiskCount} comments crossed the high-risk threshold`
  );
  setText(
    '#pageVolatilityDetail',
    metrics.volatility.flagged
      ? 'Rapid emotional swings were detected inside this thread.'
      : 'The thread tone was comparatively consistent.'
  );
}

export function renderSummary(summary) {
  LABEL_ORDER.forEach((label) => {
    setText(`#summary-${label}`, summary[label] || 0);
  });
}

export function displayResults(results, topComments, filter, settings) {
  const container = element('#commentsContainer');
  if (!container) return;

  container.innerHTML = '';

  if (!results.length) {
    container.innerHTML =
      '<div class="no-comments">No matching comments in this view yet.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  results.forEach((result) => {
    fragment.appendChild(createCommentElement(result, topComments, filter, settings));
  });
  container.appendChild(fragment);
}

function createCommentElement(result, topComments, filter, settings) {
  const commentDiv = document.createElement('div');
  const topColor = LABELS[result.topPrediction?.label]?.color || '#dbe2ea';
  commentDiv.className = 'comment';
  commentDiv.style.borderLeftColor = topColor;

  const isTopComment =
    topComments[result.topPrediction?.label]?.originalIndex === result.originalIndex;

  const header = document.createElement('div');
  header.className = 'comment-meta';
  header.innerHTML = `
    <span class="comment-pill" style="background:${topColor}20;color:${topColor};">
      ${LABELS[result.topPrediction?.label]?.name || 'Unknown'}
    </span>
    <span class="comment-pill subtle">${describeRisk(result.riskScore)} ${Math.round(
      result.riskScore * 100
    )}%</span>
    ${
      isTopComment && filter !== 'all'
        ? '<span class="comment-pill subtle">Top match</span>'
        : ''
    }
  `;

  const commentText = document.createElement('div');
  commentText.className = 'comment-text';
  commentText.textContent = result.text;

  const sentimentBars = document.createElement('div');
  sentimentBars.className = 'sentiment-bars';

  result.predictions.forEach((prediction) => {
    const info = LABELS[prediction.label] || {
      name: prediction.label,
      color: '#94a3b8',
    };
    const label = document.createElement('div');
    label.className = 'sentiment-label';
    label.innerHTML = `<span>${info.name}</span><span>${Math.round(
      prediction.score * 100
    )}%</span>`;

    const bar = document.createElement('div');
    bar.className = 'sentiment-bar';
    bar.innerHTML = `<div class="sentiment-fill" style="width:${Math.round(
      prediction.score * 100
    )}%;background:${info.color};"></div>`;

    sentimentBars.appendChild(label);
    sentimentBars.appendChild(bar);
  });

  commentDiv.appendChild(header);
  commentDiv.appendChild(commentText);
  commentDiv.appendChild(sentimentBars);

  if (isShielded(result.riskScore, settings)) {
    commentDiv.classList.add('shielded');
    commentDiv.title = 'Click to reveal this comment';
    commentDiv.addEventListener(
      'click',
      () => {
        commentDiv.classList.toggle('revealed');
      },
      { once: true }
    );
  }

  return commentDiv;
}

export function getFilteredResults(results, filter) {
  if (filter === 'all') {
    return [...results].sort((left, right) => left.originalIndex - right.originalIndex);
  }

  return results
    .filter((result) =>
      result.predictions?.some((prediction) => prediction.label === filter)
    )
    .sort((left, right) => {
      const leftScore =
        left.predictions.find((prediction) => prediction.label === filter)?.score || 0;
      const rightScore =
        right.predictions.find((prediction) => prediction.label === filter)?.score || 0;
      return rightScore - leftScore;
    });
}

export function setActiveFilter(filter) {
  elements('.filter-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === filter);
  });
}

export function showAnalysisError(message) {
  hideAnalysisLoader();
  setText('#analysisStatus', message);
  element('#analysisStatus')?.classList.remove('hidden');
}

function setText(selector, value) {
  const target = element(selector);
  if (target) target.textContent = value;
}
