import * as ui from './ui.js';
import { extractAndAnalyze, processNextBatch } from './comments.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      state.activeFilter = filter;
      ui.setActiveFilter(filter);
      ui.toggleCommentsContainer(true);

      let filteredResults = [];
      if (filter === 'all') {
        filteredResults = [...state.analyzedResults].sort(
          (a, b) => a.originalIndex - b.originalIndex
        );
      } else {
        filteredResults = state.analyzedResults
          .filter((item) => item?.predictions?.some((p) => p.label === filter))
          .sort((a, b) => {
            const aScore = a.predictions.find((p) => p.label === filter)?.score || 0;
            const bScore = b.predictions.find((p) => p.label === filter)?.score || 0;
            return bScore - aScore;
          });
      }
      ui.displayResults(filteredResults, state.topComments, filter);
    });
  });

  document.getElementById('analyze').addEventListener('click', () => {
    ui.showResultsContainers();
    extractAndAnalyze();
  });

  document.getElementById('loadMore').addEventListener('click', processNextBatch);

  ui.setActiveFilter(state.activeFilter);
});
