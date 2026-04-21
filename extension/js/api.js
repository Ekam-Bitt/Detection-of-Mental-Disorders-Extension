import { API_TIMEOUT } from '../config.js';
import { getApiBaseUrl } from './backend-api.js';

export async function analyzeEmotion(text) {
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

/**
 * Send an entire batch of comments in a single API request.
 * Returns an array of { text, predictions } in the same order as the input.
 */
export async function analyzeBatch(texts) {
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
