import * as ui from './ui.js';
import { extractAndAnalyze, processNextBatch } from './comments.js';
import { state } from './state.js';

import { DEFAULT_API_BASE_URL } from '../config.js';

document.addEventListener('DOMContentLoaded', () => {
  // Settings UI
  const apiBaseUrlInput = document.getElementById('apiBaseUrl');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const settingsMessage = document.getElementById('settingsMessage');

  chrome.storage.sync.get(['apiBaseUrl'], (result) => {
    apiBaseUrlInput.value = result.apiBaseUrl || DEFAULT_API_BASE_URL;
  });

  saveSettingsBtn.addEventListener('click', () => {
    const url = apiBaseUrlInput.value.trim() || DEFAULT_API_BASE_URL;
    chrome.storage.sync.set({ apiBaseUrl: url }, () => {
      apiBaseUrlInput.value = url;
      settingsMessage.textContent = 'Saved!';
      setTimeout(() => {
        settingsMessage.textContent = '';
      }, 2000);
    });
  });

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
