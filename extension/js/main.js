import { extractAndAnalyze } from './comments.js';
import { state } from './state.js';
import * as ui from './ui.js';
import { getApiBaseUrl } from './backend-api.js';
import { loadShieldSettings, setShieldMode, setThreshold } from './shield.js';
import {
  getDashboardSnapshot,
  loadWellbeingSettings,
  saveWellbeingSettings,
} from './wellbeing-storage.js';

let currentSettings = null;
let currentAnalysis = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentSettings = await loadShieldSettings();
  await refreshDashboard();
  ui.syncSettings(currentSettings);
  ui.setActiveView('dashboard');

  bindViewToggles();
  bindSettings();
  bindFilters();
  bindAnalyzeButton();
  bindOpenHub();
});

async function refreshDashboard() {
  try {
    const snapshot = await getDashboardSnapshot();
    ui.renderDashboard(snapshot.dashboard);
  } catch (error) {
    console.error('Failed to load dashboard snapshot:', error);
    ui.renderDashboard({
      highRiskShare: 0,
      averageRisk: 0,
      volatility: { flagged: false },
      totalMinutes: 0,
      insight:
        'The local hub is unreachable. Start the backend to sync dashboard data.',
      lastUpdated: null,
      calmShare: 0,
      guardedShare: 0,
      intenseShare: 0,
      dailySeries: [],
    });
  }
}

function bindViewToggles() {
  document.querySelectorAll('[data-view-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      ui.setActiveView(button.dataset.viewToggle);
    });
  });
}

function bindSettings() {
  document.getElementById('shieldMode')?.addEventListener('change', async (event) => {
    currentSettings = await setShieldMode(event.target.checked);
    rerenderAnalysis();
  });

  document
    .getElementById('thresholdSlider')
    ?.addEventListener('input', async (event) => {
      currentSettings = await setThreshold(Number(event.target.value) / 100);
      ui.syncSettings(currentSettings);
      rerenderAnalysis();
    });

  document.getElementById('nudgesToggle')?.addEventListener('change', async (event) => {
    currentSettings = await saveWellbeingSettings({
      nudgesEnabled: event.target.checked,
    });
    ui.syncSettings(currentSettings);
  });

  document
    .getElementById('resourceToggle')
    ?.addEventListener('change', async (event) => {
      currentSettings = await saveWellbeingSettings({
        resourcePromptsEnabled: event.target.checked,
      });
      ui.syncSettings(currentSettings);
    });
}

function bindFilters() {
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeFilter = button.dataset.filter;
      rerenderAnalysis();
    });
  });
}

function bindAnalyzeButton() {
  document.getElementById('analyze')?.addEventListener('click', async () => {
    ui.setActiveView('analysis');

    try {
      const analysis = await extractAndAnalyze({
        onProgress: (message) => ui.showAnalysisLoader(message),
      });

      if (!analysis.comments.length) {
        ui.showAnalysisError('No supported comments were found on this page.');
        return;
      }

      currentAnalysis = analysis;
      rerenderAnalysis();

      await chrome.runtime.sendMessage({
        type: 'MANUAL_ANALYSIS_CAPTURED',
        payload: {
          tabId: analysis.tab.id,
          url: analysis.tab.url,
          title: analysis.tab.title,
          metrics: analysis.metrics,
        },
      });

      await refreshDashboard();
    } catch (error) {
      console.error('Analysis failed:', error);
      const message =
        error.name === 'AbortError'
          ? 'The local analysis service timed out. Please try again.'
          : `Analysis failed: ${error.message}`;
      ui.showAnalysisError(message);
    }
  });
}

function bindOpenHub() {
  document.getElementById('openHub')?.addEventListener('click', async () => {
    const baseUrl = await getApiBaseUrl();
    await chrome.tabs.create({ url: `${baseUrl}/` });
  });
}

function rerenderAnalysis() {
  if (!currentAnalysis) return;

  ui.renderAnalysis(
    currentAnalysis.metrics,
    currentAnalysis.topComments,
    state.activeFilter,
    currentSettings
  );
}

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local') return;

  if (changes.wellbeingSettings) {
    currentSettings = await loadWellbeingSettings();
    ui.syncSettings(currentSettings);
    rerenderAnalysis();
  }

  if (changes.wellbeingHistory) {
    await refreshDashboard();
  }
});
