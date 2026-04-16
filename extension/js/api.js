import { DEFAULT_API_BASE_URL, API_TIMEOUT } from '../config.js';

export async function analyzeComments(comments) {
  if (!Array.isArray(comments) || comments.length === 0) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${DEFAULT_API_BASE_URL}/api/v2/analyze/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}
