import { DEFAULT_SHIELD_THRESHOLD, SHIELD_STORAGE_KEY } from '../config.js';

export const shieldState = {
  enabled: false,
  threshold: DEFAULT_SHIELD_THRESHOLD,
};

export async function loadShieldSettings() {
  try {
    const result = await chrome.storage.local.get(SHIELD_STORAGE_KEY);
    if (result[SHIELD_STORAGE_KEY]) {
      shieldState.enabled = result[SHIELD_STORAGE_KEY].enabled;
      shieldState.threshold = result[SHIELD_STORAGE_KEY].threshold;
    }
  } catch (error) {
    console.error('Failed to load shield settings:', error);
    shieldState.enabled = false;
    shieldState.threshold = DEFAULT_SHIELD_THRESHOLD;
  }
  return shieldState;
}

export async function saveShieldSettings() {
  try {
    await chrome.storage.local.set({
      [SHIELD_STORAGE_KEY]: {
        enabled: shieldState.enabled,
        threshold: shieldState.threshold,
      },
    });
  } catch (error) {
    console.error('Failed to save shield settings:', error);
  }
}

export function setShieldMode(enabled) {
  shieldState.enabled = enabled;
  saveShieldSettings();
}

export function setThreshold(value) {
  shieldState.threshold = value;
  saveShieldSettings();
}

export function isShielded(score) {
  return shieldState.enabled && score < shieldState.threshold;
}

export function getThreshold() {
  return shieldState.threshold;
}

export function isEnabled() {
  return shieldState.enabled;
}
