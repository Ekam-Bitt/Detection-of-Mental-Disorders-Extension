import { DEFAULT_WELLBEING_SETTINGS } from '../config.js';
import { loadWellbeingSettings, saveWellbeingSettings } from './wellbeing-storage.js';

export const shieldState = {
  ...DEFAULT_WELLBEING_SETTINGS,
};

export async function loadShieldSettings() {
  const settings = await loadWellbeingSettings();
  Object.assign(shieldState, settings);
  return shieldState;
}

export async function setShieldMode(enabled) {
  const next = await saveWellbeingSettings({ shieldEnabled: enabled });
  Object.assign(shieldState, next);
  return shieldState;
}

export async function setThreshold(value) {
  const next = await saveWellbeingSettings({ shieldThreshold: value });
  Object.assign(shieldState, next);
  return shieldState;
}

export function isShielded(riskScore, settings = shieldState) {
  return settings.shieldEnabled && riskScore >= settings.shieldThreshold;
}
