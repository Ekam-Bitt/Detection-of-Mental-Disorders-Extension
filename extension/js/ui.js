import { SIGNALS, SIGNAL_MAP } from '../config.js';

const SELECTORS = {
  filterBtns: '.filter-btn',
  disclaimer: '#disclaimer',
  evidenceContainer: '#evidenceContainer',
  commentsContainer: '#commentsContainer',
  chartContainer: '.chart-container',
  filterContainer: '.filter-container',
  resultsShell: '#resultsShell',
  summaryContainer: '#summaryContainer',
  statusCard: '#statusCard',
  statusText: '#statusText',
  runMeta: '#runMeta',
  metricComments: '#metricComments',
  metricConfidence: '#metricConfidence',
  metricUncertainty: '#metricUncertainty',
  signalSummary: '#signalSummary',
};

const getEl = (selector) => document.querySelector(selector);
const getAllEl = (selector) => document.querySelectorAll(selector);

export function showLoader(text) {
  updateStatus(text, 'working');
  getEl(SELECTORS.resultsShell)?.classList.remove('hidden');
}

export function updateStatus(text, tone = 'default') {
  const card = getEl(SELECTORS.statusCard);
  const textEl = getEl(SELECTORS.statusText);
  if (card) {
    card.dataset.tone = tone;
  }
  if (textEl) {
    textEl.textContent = text;
  }
}

export function setRunMeta(meta) {
  const runMeta = getEl(SELECTORS.runMeta);
  if (!runMeta) return;
  const parts = [];
  if (meta.detectedCount != null) {
    parts.push(`${meta.detectedCount} comments detected`);
  }
  if (meta.processedCount != null && meta.processedCount !== meta.detectedCount) {
    parts.push(`${meta.processedCount} analyzed locally`);
  }
  if (meta.backend) {
    parts.push(`backend: ${meta.backend}`);
  }
  runMeta.textContent = parts.join(' • ');
}

export function setDisclaimer(text) {
  const disclaimer = getEl(SELECTORS.disclaimer);
  if (disclaimer) {
    disclaimer.textContent = text || '';
  }
}

export function renderFilters() {
  const container = getEl(SELECTORS.filterContainer);
  if (!container) return;
  container.innerHTML = `
    <button class="filter-btn active" data-filter="all">All Comments</button>
    ${SIGNALS.filter((signal) => signal.key !== 'no_clear_signal')
      .map(
        (signal) =>
          `<button class="filter-btn" data-filter="${signal.key}">${signal.shortName}</button>`
      )
      .join('')}
  `;
}

export function renderSummary(summary) {
  getEl(SELECTORS.summaryContainer)?.classList.remove('hidden');
  getEl(SELECTORS.resultsShell)?.classList.remove('hidden');

  const comments = getEl(SELECTORS.metricComments);
  const confidence = getEl(SELECTORS.metricConfidence);
  const uncertainty = getEl(SELECTORS.metricUncertainty);

  if (comments) {
    comments.textContent = String(summary?.comment_count || 0);
  }
  if (confidence) {
    confidence.textContent = `${Math.round((summary?.average_confidence || 0) * 100)}%`;
  }
  if (uncertainty) {
    uncertainty.textContent = summary?.insufficient_evidence
      ? 'Insufficient'
      : summary?.overall_uncertainty || 'unknown';
  }

  const signalSummary = getEl(SELECTORS.signalSummary);
  if (!signalSummary) return;

  signalSummary.innerHTML = (summary?.signal_prevalence || [])
    .filter((signal) => signal.key !== 'no_clear_signal')
    .sort((a, b) => b.mean_score - a.mean_score)
    .map((signal) => {
      const info = SIGNAL_MAP[signal.key] || {
        color: '#6b7280',
        name: signal.display_name,
      };
      return `
        <div class="signal-pill">
          <span class="signal-dot" style="background:${info.color}"></span>
          <span>${info.name || signal.display_name}</span>
          <strong>${Math.round(signal.mean_score * 100)}%</strong>
        </div>
      `;
    })
    .join('');
}

export function renderEvidence(evidence = {}) {
  const container = getEl(SELECTORS.evidenceContainer);
  if (!container) return;

  const sections = Object.entries(evidence)
    .filter(([, items]) => Array.isArray(items) && items.length > 0)
    .map(([signalKey, items]) => {
      const signal = SIGNAL_MAP[signalKey] || { name: signalKey, color: '#6b7280' };
      return `
        <section class="evidence-section">
          <div class="evidence-heading">
            <span class="signal-dot" style="background:${signal.color}"></span>
            <h3>${signal.name}</h3>
          </div>
          ${items
            .map(
              (item) => `
                <article class="evidence-item">
                  <div class="evidence-meta">${item.source_platform} • ${
                    item.severity
                  } • ${Math.round(item.signal_score * 100)}%</div>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `
            )
            .join('')}
        </section>
      `;
    });

  container.innerHTML =
    sections.join('') ||
    '<div class="empty-panel">No strong evidence comments surfaced for this page.</div>';
}

export function renderComments(results, filter) {
  const container = getEl(SELECTORS.commentsContainer);
  if (!container) return;

  container.innerHTML = '';

  if (results.length === 0) {
    const title =
      filter === 'all'
        ? 'No analyzed comments available yet.'
        : 'No comments matched this signal filter.';
    container.innerHTML = `<div class="empty-panel">${title}</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  results.forEach((result) => {
    const commentDiv = createCommentElement(result);
    fragment.appendChild(commentDiv);
  });
  container.appendChild(fragment);
}

function createCommentElement(result) {
  const commentDiv = document.createElement('div');
  const topSignal = result.top_signal || {
    key: 'no_clear_signal',
    display_name: 'No Clear Signal',
  };
  const topColor = SIGNAL_MAP[topSignal.key]?.color || '#6b7280';
  commentDiv.className = 'comment';
  commentDiv.style.borderLeft = `5px solid ${topColor}`;

  const commentText = document.createElement('div');
  commentText.className = 'comment-text';
  commentText.textContent = result.text;
  commentDiv.appendChild(commentText);

  const meta = document.createElement('div');
  meta.className = 'comment-meta';
  meta.innerHTML = `
    <span class="comment-chip" style="background:${topColor}">${
      topSignal.display_name
    }</span>
    <span class="comment-chip subtle">${result.severity?.label || 'none'}</span>
    <span class="comment-chip subtle">${Math.round(
      (result.confidence || 0) * 100
    )}% confidence</span>
    <span class="comment-chip subtle">${result.source_platform || 'unknown'}</span>
  `;
  commentDiv.appendChild(meta);

  const signalBarsContainer = document.createElement('div');
  signalBarsContainer.className = 'signal-bars';

  (result.signals || [])
    .filter((signal) => signal.key !== 'no_clear_signal')
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .forEach((signal) => {
      const info = SIGNAL_MAP[signal.key] || {
        name: signal.display_name,
        color: '#6b7280',
      };
      const labelDiv = document.createElement('div');
      labelDiv.className = 'sentiment-label';
      labelDiv.innerHTML = `<span>${
        info.name || signal.display_name
      }</span><span>${Math.round(signal.score * 100)}%</span>`;

      const barDiv = document.createElement('div');
      barDiv.className = 'sentiment-bar';
      const fillDiv = document.createElement('div');
      fillDiv.className = 'sentiment-fill';
      fillDiv.style.width = `${Math.max(4, Math.round(signal.score * 100))}%`;
      fillDiv.style.backgroundColor = info.color;
      barDiv.appendChild(fillDiv);

      signalBarsContainer.appendChild(labelDiv);
      signalBarsContainer.appendChild(barDiv);
    });

  commentDiv.appendChild(signalBarsContainer);

  return commentDiv;
}

export function setActiveFilter(filter) {
  getAllEl(SELECTORS.filterBtns).forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
}

export function showResultsContainers() {
  getEl(SELECTORS.chartContainer)?.classList.remove('hidden');
  getEl(SELECTORS.filterContainer)?.classList.remove('hidden');
  getEl(SELECTORS.summaryContainer)?.classList.remove('hidden');
  getEl(SELECTORS.commentsContainer)?.classList.remove('hidden');
  getEl(SELECTORS.evidenceContainer)?.classList.remove('hidden');
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
