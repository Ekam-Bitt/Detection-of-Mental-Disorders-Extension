import { extractAndAnalyze } from './comments.js';
import { addAnalyzedResults, resetState, state } from './state.js';
import * as ui from './ui.js';
import { getApiBaseUrl } from './backend-api.js';
import { loadShieldSettings, setShieldMode, setThreshold } from './shield.js';
import {
  getDashboardSnapshot,
  loadWellbeingSettings,
  saveWellbeingSettings,
} from './wellbeing-storage.js';
import { getMode, setMode, checkLocalHealth, isCloudMode } from './mode.js';

let currentSettings = null;
let currentAnalysis = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentSettings = await loadShieldSettings();
  ui.syncSettings(currentSettings);
  ui.setActiveView('dashboard');

  // Initialize mode toggle and settings
  await initializeModeToggle();
  await syncModeUI(await getMode());
  await refreshDashboard();

  bindViewToggles();
  bindSettings();
  bindFilters();
  bindAnalyzeButton();
  bindOpenHub();

  await checkExistingAnalysis();
});

// ---------------------------------------------------------------------------
// Mode Toggle
// ---------------------------------------------------------------------------

async function initializeModeToggle() {
  // Check local backend status
  updateLocalStatus();

  // Bind radio buttons
  document.querySelectorAll('input[name="inferenceMode"]').forEach((radio) => {
    radio.addEventListener('change', async (event) => {
      const newMode = event.target.value;

      if (newMode === 'local') {
        const health = await checkLocalHealth();
        if (!health.available) {
          document.getElementById('localSetupGuide')?.classList.remove('hidden');
        } else {
          document.getElementById('localSetupGuide')?.classList.add('hidden');
        }
      } else {
        document.getElementById('localSetupGuide')?.classList.add('hidden');
      }

      await setMode(newMode);
      await syncModeUI(newMode);
      await refreshDashboard();
    });
  });

  // Retry button
  document.getElementById('retryLocalCheck')?.addEventListener('click', async () => {
    await updateLocalStatus();
  });
}

async function syncModeUI(mode) {
  const isCloud = mode === 'cloud';
  const badge = document.getElementById('modeStatusBadge');
  const cloudOption = document.getElementById('modeOptionCloud');
  const localOption = document.getElementById('modeOptionLocal');
  const cloudRadio = cloudOption?.querySelector('input');
  const localRadio = localOption?.querySelector('input');
  const cloudBanner = document.getElementById('cloudModeBanner');
  const dashboardLinkRow = document.getElementById('dashboardLinkRow');

  // Update radio state
  if (cloudRadio) cloudRadio.checked = isCloud;
  if (localRadio) localRadio.checked = !isCloud;

  // Update active styling
  cloudOption?.classList.toggle('active', isCloud);
  localOption?.classList.toggle('active', !isCloud);

  // Update badge
  if (badge) {
    badge.textContent = isCloud ? 'Cloud' : 'Local';
    badge.className = `mode-status-badge ${isCloud ? 'badge-cloud' : 'badge-local'}`;
  }

  // Show/hide cloud banner and hub link
  cloudBanner?.classList.toggle('hidden', !isCloud);
  dashboardLinkRow?.classList.toggle('hidden', isCloud);

  // Show/hide dashboard panels based on mode
  const dashboardPanels = document.querySelectorAll('#dashboardView .panel');
  const statsGrid = document.querySelector('#dashboardView .stats-grid');
  dashboardPanels.forEach((panel) => panel.classList.toggle('hidden', isCloud));
  statsGrid?.classList.toggle('hidden', isCloud);
}

async function updateLocalStatus() {
  const localStatusEl = document.getElementById('localStatus');
  const setupGuide = document.getElementById('localSetupGuide');

  if (localStatusEl) localStatusEl.textContent = 'Checking...';

  const health = await checkLocalHealth();

  if (health.available && health.modelLoaded) {
    if (localStatusEl) {
      localStatusEl.textContent = 'Backend online';
      localStatusEl.className = 'mode-option-status status-online';
    }
    setupGuide?.classList.add('hidden');
  } else if (health.available) {
    if (localStatusEl) {
      localStatusEl.textContent = 'Backend online, model loading...';
      localStatusEl.className = 'mode-option-status status-warning';
    }
    setupGuide?.classList.add('hidden');
  } else {
    if (localStatusEl) {
      localStatusEl.textContent = 'Backend not detected';
      localStatusEl.className = 'mode-option-status status-offline';
    }

    // Only show setup guide if user is currently in local mode
    const mode = await getMode();
    if (mode === 'local') {
      setupGuide?.classList.remove('hidden');
    }
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

async function checkExistingAnalysis() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_SESSION' });
    if (response?.ok && response.session?.latestMetrics) {
      resetState();
      addAnalyzedResults(response.session.latestMetrics.results);
      currentAnalysis = {
        metrics: response.session.latestMetrics,
        topComments: state.topComments,
      };
      rerenderAnalysis();
    }
  } catch (error) {
    console.error('Failed to check existing analysis:', error);
  }
}

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
      insight: (await isCloudMode())
        ? 'Dashboard and trend tracking are available in Local mode.'
        : 'The local hub is unreachable. Start the backend to sync dashboard data.',
      lastUpdated: null,
      calmShare: 0,
      guardedShare: 0,
      intenseShare: 0,
      dailySeries: [],
    });
  }
}

// ---------------------------------------------------------------------------
// View Toggles & Settings
// ---------------------------------------------------------------------------

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
      // Show appropriate loading message based on mode
      const cloud = await isCloudMode();
      const loadingMsg = cloud
        ? 'Analyzing via cloud model...'
        : 'Analyzing via local model...';

      const analysis = await extractAndAnalyze({
        onProgress: (message) => ui.showAnalysisLoader(message || loadingMsg),
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

      if (!cloud) {
        await refreshDashboard();
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      const cloud = await isCloudMode();
      let message;
      if (error.name === 'AbortError') {
        message = cloud
          ? 'Cloud inference timed out. The HF Space may be waking up -- try again in a moment.'
          : 'The local analysis service timed out. Please try again.';
      } else {
        message = `Analysis failed: ${error.message}`;
      }
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
    state.activeFilter
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
