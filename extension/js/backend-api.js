import { API_TIMEOUT, DEFAULT_API_BASE_URL } from '../config.js';

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

export async function getSettings() {
  const data = await fetchJson('/api/settings');
  return data.settings;
}

export async function saveSettings(patch) {
  const data = await fetchJson('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.settings;
}

export async function getDashboard() {
  return fetchJson('/api/dashboard');
}

export async function postEvent(event) {
  return fetchJson('/api/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function getSupportResource(locale, timeZone) {
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
