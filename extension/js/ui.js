import { LABELS, LABEL_ORDER } from '../config.js';
import { isShielded } from './shield.js';

const SELECTORS = {
  filterBtns: '.filter-btn',
  commentsContainer: '#commentsContainer',
  analyzeBtn: '#analyze',
  loadMoreBtn: '#loadMore',
  loadMoreContainer: '#loadMoreContainer',
  chartContainer: '.chart-container',
  filterContainer: '.filter-container',
  summaryContainer: '#summaryContainer',
};

const LABEL_INFO = LABELS;

const getEl = (selector) => document.querySelector(selector);
const getAllEl = (selector) => document.querySelectorAll(selector);

export function showLoader(text) {
  const chartContainer = getEl(SELECTORS.chartContainer);
  if (chartContainer) {
    chartContainer.innerHTML = `
            <div class="loader">
                <img src="icons/spinner.gif" class="loader-gif" alt="Loading">
                <div class="loader-text">${text}</div>
            </div>`;
  }
}

export function hideLoader() {
  const chartContainer = getEl(SELECTORS.chartContainer);
  if (chartContainer) {
    chartContainer.innerHTML = '<canvas id="sentimentChart"></canvas>';
  }
}

// API key UI removed. No functions related to updating or toggling an API key remain.

export function toggleCommentsContainer(show) {
  getEl(SELECTORS.commentsContainer)?.classList.toggle('hidden', !show);
}

export function toggleLoadMore(show, remaining = 0) {
  const container = getEl(SELECTORS.loadMoreContainer);
  const button = getEl(SELECTORS.loadMoreBtn);
  if (container) {
    container.classList.toggle('hidden', !show);
  }
  if (button && show) {
    button.textContent = `Load More (${remaining} remaining)`;
  }
}

export function setLoadMoreState(isLoading) {
  const button = getEl(SELECTORS.loadMoreBtn);
  if (button) {
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Processing...' : 'Load More Comments';
  }
}

export function updateSummary(summary) {
  // summary is expected to be an object keyed by LABEL_*
  LABEL_ORDER.forEach((label) => {
    const el = getEl(`#summary-${label}`);
    if (el) el.textContent = summary[label] || 0;
  });
}

export function displayResults(results, topComments, filter) {
  const container = getEl(SELECTORS.commentsContainer);
  if (!container) return;

  container.innerHTML = '';

  if (results.length === 0) {
    container.innerHTML = '<div class="no-comments">No comments found</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  results.forEach((result) => {
    if (!result?.predictions || result.predictions.length === 0) return;
    const commentDiv = createCommentElement(result, topComments, filter);
    fragment.appendChild(commentDiv);
  });
  container.appendChild(fragment);
}

function createCommentElement(result, topComments, filter) {
  const commentDiv = document.createElement('div');
  const topPrediction = result.predictions.reduce((prev, current) =>
    prev.score > current.score ? prev : current
  );
  const topColor = LABEL_INFO[topPrediction.label]?.color || '#ddd';
  commentDiv.className = `comment`;
  commentDiv.style.borderLeft = `5px solid ${topColor}`;

  // Apply shield effect
  if (isShielded(topPrediction.score)) {
    commentDiv.classList.add('shielded');
    commentDiv.dataset.shielded = 'true';

    const overlay = document.createElement('div');
    overlay.className = 'shield-overlay';
    overlay.textContent = 'Click to reveal';
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      commentDiv.classList.add('revealed');
      overlay.style.display = 'none';
    });
    commentDiv.appendChild(overlay);
  }

  const topCommentForLabel = topComments[topPrediction.label];
  const isTopComment =
    topCommentForLabel && result.originalIndex === topCommentForLabel.originalIndex;

  const commentText = document.createElement('div');
  commentText.className = 'comment-text';
  commentText.textContent = result.text;
  commentDiv.appendChild(commentText);

  const sentimentBarsContainer = document.createElement('div');
  sentimentBarsContainer.className = 'sentiment-bars';

  result.predictions.forEach((p) => {
    const info = LABEL_INFO[p.label] || { name: p.label, color: '#ccc' };
    const labelDiv = document.createElement('div');
    labelDiv.className = 'sentiment-label';
    labelDiv.innerHTML = `<span>${info.name}</span><span>${(p.score * 100).toFixed(
      2
    )}%</span>`;

    const barDiv = document.createElement('div');
    barDiv.className = 'sentiment-bar';
    const fillDiv = document.createElement('div');
    fillDiv.className = 'sentiment-fill';
    fillDiv.style.width = `${(p.score * 100).toFixed(2)}%`;
    fillDiv.style.backgroundColor = info.color;
    barDiv.appendChild(fillDiv);

    sentimentBarsContainer.appendChild(labelDiv);
    sentimentBarsContainer.appendChild(barDiv);
  });

  commentDiv.appendChild(sentimentBarsContainer);

  if (isTopComment && filter !== 'all') {
    const human = LABEL_INFO[topPrediction.label]?.name || topPrediction.label;
    const badge = document.createElement('div');
    badge.className = 'top-badge';
    badge.textContent = `Top ${human}`;
    badge.style.backgroundColor = topColor;
    commentDiv.appendChild(badge);
  }

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
}
