/**
 * Mode Manager — Central hub for Cloud vs Local inference mode.
 *
 * Stored in chrome.storage.sync so the choice persists across sessions.
 * Cloud mode talks to the HF Space; Local mode talks to localhost:8000.
 */

import {
  CLOUD_API_BASE_URL,
  DEFAULT_API_BASE_URL,
  DEFAULT_INFERENCE_MODE,
  INFERENCE_MODE_CLOUD,
  INFERENCE_MODE_KEY,
  INFERENCE_MODE_LOCAL,
} from '../config.js';

/**
 * Get the current inference mode ('cloud' or 'local').
 */
export async function getMode() {
  const result = await chrome.storage.sync.get(INFERENCE_MODE_KEY);
  return result[INFERENCE_MODE_KEY] || DEFAULT_INFERENCE_MODE;
}

/**
 * Set the inference mode.
 * @param {'cloud' | 'local'} mode
 */
export async function setMode(mode) {
  if (mode !== INFERENCE_MODE_CLOUD && mode !== INFERENCE_MODE_LOCAL) {
    throw new Error(`Invalid inference mode: ${mode}`);
  }
  await chrome.storage.sync.set({ [INFERENCE_MODE_KEY]: mode });
  return mode;
}

/**
 * Convenience: is the user currently in cloud mode?
 */
export async function isCloudMode() {
  return (await getMode()) === INFERENCE_MODE_CLOUD;
}

/**
 * Convenience: is the user currently in local mode?
 */
export async function isLocalMode() {
  return (await getMode()) === INFERENCE_MODE_LOCAL;
}

/**
 * Probe the local Docker backend's /health endpoint.
 * Returns { available, modelLoaded } within a 3-second window.
 */
export async function checkLocalHealth() {
  const LOCAL_HEALTH_TIMEOUT = 3000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOCAL_HEALTH_TIMEOUT);

    const response = await fetch(`${DEFAULT_API_BASE_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { available: false, modelLoaded: false };
    }

    const data = await response.json();
    return {
      available: true,
      modelLoaded: data.model === 'loaded',
    };
  } catch {
    return { available: false, modelLoaded: false };
  }
}

/**
 * Cloud inference base URL (HF Space).
 */
export function getCloudBaseUrl() {
  return CLOUD_API_BASE_URL;
}

/**
 * Local inference base URL (Docker backend).
 */
export function getLocalBaseUrl() {
  return DEFAULT_API_BASE_URL;
}
