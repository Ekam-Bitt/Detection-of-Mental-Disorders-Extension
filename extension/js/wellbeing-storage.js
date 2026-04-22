import { DEFAULT_WELLBEING_SETTINGS, WELLBEING_SETTINGS_KEY } from '../config.js';
import { getDashboard, getSettings, saveSettings } from './backend-api.js';

async function cacheSettings(settings) {
  await chrome.storage.local.set({
    [WELLBEING_SETTINGS_KEY]: settings,
  });
  return settings;
}

export async function loadWellbeingSettings() {
  try {
    const settings = await getSettings();
    return cacheSettings({
      ...DEFAULT_WELLBEING_SETTINGS,
      ...settings,
    });
  } catch (error) {
    console.warn('Falling back to cached wellbeing settings:', error);
    const result = await chrome.storage.local.get(WELLBEING_SETTINGS_KEY);
    return {
      ...DEFAULT_WELLBEING_SETTINGS,
      ...(result[WELLBEING_SETTINGS_KEY] || {}),
    };
  }
}

export async function saveWellbeingSettings(patch) {
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
