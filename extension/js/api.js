import { API_TIMEOUT, CLOUD_API_TIMEOUT, LABELS } from '../config.js';
import { getApiBaseUrl } from './backend-api.js';
import { isCloudMode, getCloudBaseUrl } from './mode.js';

function normalizePredictions(predictions) {
  const nameToLabelKey = Object.fromEntries(
    Object.entries(LABELS).map(([key, value]) => [value.name, key])
  );

  return predictions.map((p) => {
    let newLabel = p.label;
    if (nameToLabelKey[p.label]) {
      newLabel = nameToLabelKey[p.label];
    }
    return { ...p, label: newLabel };
  });
}

function describeFetchFailure(error, target) {
  if (error.name === 'AbortError') {
    return error;
  }

  if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
    const message =
      target === 'cloud'
        ? 'Cloud inference service is unreachable. Check your internet connection or try again after the HF Space wakes up.'
        : 'Local backend is unreachable. Start the Docker backend or switch the extension to Cloud mode.';
    return new Error(message, { cause: error });
  }

  return error;
}

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
      predictions: normalizePredictions(results[i] || []),
    }));
  } catch (error) {
    clearTimeout(timeoutId);

    // Retry once on timeout (likely cold start)
    if (error.name === 'AbortError') {
      return retryCloudBatch(texts);
    }

    throw describeFetchFailure(error, 'cloud');
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
      predictions: normalizePredictions(results[i] || []),
    }));
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(
        'Cloud inference timed out. The HF Space may be sleeping — try again in a minute.'
      );
    }

    throw describeFetchFailure(error, 'cloud');
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

    return { text, predictions: normalizePredictions(predictions) };
  } catch (error) {
    const normalizedError = describeFetchFailure(error, 'local');
    console.error('Analysis error:', normalizedError);
    throw normalizedError;
  }
}

async function analyzeBatchLocal(texts) {
  const baseUrl = await getApiBaseUrl();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
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
      predictions: normalizePredictions(results[i] || []),
    }));
  } catch (error) {
    throw describeFetchFailure(error, 'local');
  } finally {
    clearTimeout(timeoutId);
  }
}
