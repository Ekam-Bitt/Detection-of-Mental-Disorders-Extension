import { API_TIMEOUT, CLOUD_API_TIMEOUT } from '../config.js';
import { getApiBaseUrl } from './backend-api.js';
import { isCloudMode, getCloudBaseUrl } from './mode.js';

/**
 * Analyze a single text. Returns { text, predictions }.
 */
export async function analyzeEmotion(text) {
  const cloud = await isCloudMode();

  if (cloud) {
    return analyzeEmotionCloud(text);
  }

  return analyzeEmotionLocal(text);
}

/**
 * Send an entire batch of comments in a single API request.
 * Returns an array of { text, predictions } in the same order as the input.
 *
 * Routes to cloud or local based on the current inference mode.
 */
export async function analyzeBatch(texts) {
  const cloud = await isCloudMode();

  if (cloud) {
    return analyzeBatchCloud(texts);
  }

  return analyzeBatchLocal(texts);
}

// ---------------------------------------------------------------------------
// Cloud inference (HF Space)
// ---------------------------------------------------------------------------

async function analyzeEmotionCloud(text) {
  const results = await analyzeBatchCloud([text]);
  return results[0];
}

async function analyzeBatchCloud(texts) {
  const baseUrl = getCloudBaseUrl();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLOUD_API_TIMEOUT);

  try {
    const response = await fetch(`${baseUrl}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Retry once on 503 (HF Space cold start / sleeping)
      if (response.status === 503) {
        return retryCloudBatch(texts);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Cloud API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];

    return texts.map((text, i) => ({
      text,
      predictions: results[i] || [],
    }));
  } catch (error) {
    clearTimeout(timeoutId);

    // Retry once on timeout (likely cold start)
    if (error.name === 'AbortError') {
      return retryCloudBatch(texts);
    }

    throw error;
  }
}

async function retryCloudBatch(texts) {
  const baseUrl = getCloudBaseUrl();

  // Wait 5 seconds before retrying (let the Space wake up)
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLOUD_API_TIMEOUT);

  try {
    const response = await fetch(`${baseUrl}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail ||
          `Cloud API unavailable (${response.status}). The model may still be waking up — try again in a moment.`
      );
    }

    const data = await response.json();
    const results = data.results || [];

    return texts.map((text, i) => ({
      text,
      predictions: results[i] || [],
    }));
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(
        'Cloud inference timed out. The HF Space may be sleeping — try again in a minute.'
      );
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Local inference (Docker backend)
// ---------------------------------------------------------------------------

async function analyzeEmotionLocal(text) {
  try {
    const baseUrl = await getApiBaseUrl();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: [text] }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    const predictions = data.results?.[0] || [];

    return { text, predictions };
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

async function analyzeBatchLocal(texts) {
  const baseUrl = await getApiBaseUrl();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comments: texts }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.results || [];

  return texts.map((text, i) => ({
    text,
    predictions: results[i] || [],
  }));
}
