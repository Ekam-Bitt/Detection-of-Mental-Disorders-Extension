import { DEFAULT_WELLBEING_SETTINGS, WELLBEING_SETTINGS_KEY } from '../config.js';
import { getDashboard, getSettings, saveSettings } from './backend-api.js';
import { isCloudMode } from './mode.js';

async function cacheSettings(settings) {
  await chrome.storage.local.set({
    [WELLBEING_SETTINGS_KEY]: settings,
  });
  return settings;
}

async function readCachedSettings() {
  const result = await chrome.storage.local.get(WELLBEING_SETTINGS_KEY);
  return {
    ...DEFAULT_WELLBEING_SETTINGS,
    ...(result[WELLBEING_SETTINGS_KEY] || {}),
  };
}

export async function loadWellbeingSettings() {
  // Cloud mode: chrome.storage.local is the source of truth
  if (await isCloudMode()) {
    return readCachedSettings();
  }

  // Local mode: try backend first, fall back to chrome.storage cache
  try {
    const settings = await getSettings();
    return cacheSettings({
      ...DEFAULT_WELLBEING_SETTINGS,
      ...settings,
    });
  } catch (error) {
    console.warn('Falling back to cached wellbeing settings:', error);
    return readCachedSettings();
  }
}

export async function saveWellbeingSettings(patch) {
  // Cloud mode: merge patch into cached settings directly
  if (await isCloudMode()) {
    const current = await readCachedSettings();
    const merged = { ...current, ...patch };
    return cacheSettings(merged);
  }

  // Local mode: save to backend, cache the result
  const settings = await saveSettings(patch);
  return cacheSettings({
    ...DEFAULT_WELLBEING_SETTINGS,
    ...settings,
  });
}

export async function getDashboardSnapshot() {
  return getDashboard();
}

export async function ensureWellbeingState() {
  const settings = await loadWellbeingSettings();
  return { settings };
}
