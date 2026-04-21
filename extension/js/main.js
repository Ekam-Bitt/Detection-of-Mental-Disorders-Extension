import * as ui from './ui.js';
import { extractAndAnalyze } from './comments.js';
import { state } from './state.js';
import { loadShieldSettings, setShieldMode, setThreshold } from './shield.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize shield mode
  const shieldSettings = await loadShieldSettings();
  state.shieldEnabled = shieldSettings.enabled;
  state.shieldThreshold = shieldSettings.threshold;

  // Shield mode toggle
  const shieldModeCheckbox = document.getElementById('shieldMode');
  const thresholdContainer = document.getElementById('thresholdContainer');
  const thresholdSlider = document.getElementById('thresholdSlider');
  const thresholdValue = document.getElementById('thresholdValue');

  if (shieldModeCheckbox) {
    shieldModeCheckbox.checked = state.shieldEnabled;
    thresholdContainer?.classList.toggle('hidden', !state.shieldEnabled);

    shieldModeCheckbox.addEventListener('change', (e) => {
      setShieldMode(e.target.checked);
      state.shieldEnabled = e.target.checked;
      thresholdContainer?.classList.toggle('hidden', !e.target.checked);
      // Re-render comments if already displayed
      if (state.activeFilter) {
        const filterBtn = document.querySelector(
          `.filter-btn[data-filter="${state.activeFilter}"]`
        );
        if (filterBtn) filterBtn.click();
      }
    });
  }

  if (thresholdSlider) {
    thresholdSlider.value = state.shieldThreshold * 100;
    thresholdValue.textContent = `${Math.round(state.shieldThreshold * 100)}%`;

    thresholdSlider.addEventListener('input', (e) => {
      const value = e.target.value / 100;
      setThreshold(value);
      state.shieldThreshold = value;
      thresholdValue.textContent = `${Math.round(value * 100)}%`;
    });

    thresholdSlider.addEventListener('change', () => {
      // Re-render comments with new threshold
      if (state.activeFilter) {
        const filterBtn = document.querySelector(
          `.filter-btn[data-filter="${state.activeFilter}"]`
        );
        if (filterBtn) filterBtn.click();
      }
    });
  }

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

  ui.setActiveFilter(state.activeFilter);
});
