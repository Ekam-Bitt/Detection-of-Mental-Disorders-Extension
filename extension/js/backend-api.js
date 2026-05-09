import { API_TIMEOUT, DEFAULT_API_BASE_URL } from '../config.js';
import { isCloudMode } from './mode.js';

export async function getApiBaseUrl() {
  const storageResult = await chrome.storage.sync.get(['apiBaseUrl']);
  return (storageResult.apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, '');
}

async function fetchJson(path, options = {}) {
  const baseUrl = await getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Settings — cloud mode uses chrome.storage, local mode uses backend API
// ---------------------------------------------------------------------------

export async function getSettings() {
  if (await isCloudMode()) {
    return null; // Caller falls back to chrome.storage defaults
  }

  const data = await fetchJson('/api/settings');
  return data.settings;
}

export async function saveSettings(patch) {
  if (await isCloudMode()) {
    return patch; // Caller persists to chrome.storage directly
  }

  const data = await fetchJson('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.settings;
}

// ---------------------------------------------------------------------------
// Dashboard — local-only (no database in cloud mode)
// ---------------------------------------------------------------------------

export async function getDashboard() {
  if (await isCloudMode()) {
    return {
      dashboard: {
        highRiskShare: 0,
        averageRisk: 0,
        volatility: { flagged: false },
        totalMinutes: 0,
        insight: 'Dashboard and trend tracking are available in Local mode.',
        lastUpdated: null,
        calmShare: 0,
        guardedShare: 0,
        intenseShare: 0,
        dailySeries: [],
      },
    };
  }

  return fetchJson('/api/dashboard');
}

// ---------------------------------------------------------------------------
// Events — local-only (no persistence in cloud mode)
// ---------------------------------------------------------------------------

export async function postEvent(event) {
  if (await isCloudMode()) {
    return { status: 'skipped', reason: 'cloud_mode' };
  }

  return fetchJson('/api/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

// ---------------------------------------------------------------------------
// Support resources — try backend first, fallback handled by caller
// ---------------------------------------------------------------------------

export async function getSupportResource(locale, timeZone) {
  if (await isCloudMode()) {
    throw new Error('Cloud mode — use local fallback');
  }

  const query = new URLSearchParams({
    locale: locale || '',
    timeZone: timeZone || '',
  });
  const data = await fetchJson(`/api/support-resource?${query.toString()}`, {
    method: 'GET',
    headers: {},
  });
  return data.resource;
}
