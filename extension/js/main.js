import * as ui from './ui.js';
import { extractAndAnalyze } from './comments.js';
import { getFilteredComments, state } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
  ui.renderFilters();
  ui.setActiveFilter(state.activeFilter);

  document.getElementById('analyze').addEventListener('click', () => {
    extractAndAnalyze();
  });

  document.querySelector('.filter-container')?.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (!button) return;
    const filter = button.dataset.filter;
    state.activeFilter = filter;
    ui.setActiveFilter(filter);
    ui.renderComments(getFilteredComments(filter), filter);
  });

  ui.updateStatus(
    'Analyze a supported page to see signal summaries, severity, and evidence.',
    'default'
  );
});
