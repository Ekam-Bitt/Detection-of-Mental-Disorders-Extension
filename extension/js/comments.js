import { analyzeBatch } from './api.js';
import { summarizeResults } from './analysis.js';
import { addAnalyzedResults, getSummary, resetState, state } from './state.js';

/**
 * Extract comments from the current page and analyze only the ones
 * that have not already been analyzed. Merges new results with any
 * previously cached results from the background auto-analysis.
 */
export async function extractAndAnalyze({ onProgress } = {}) {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  onProgress?.('Extracting comments from the current page...');

  const injectedFrames = await chrome.scripting.executeScript({
    target: {
      tabId: tab.id,
      allFrames: true,
    },
    files: ['content.js'],
  });

  const comments = injectedFrames.reduce((accumulator, frame) => {
    if (Array.isArray(frame.result)) {
      return accumulator.concat(frame.result);
    }
    return accumulator;
  }, []);

  if (!comments.length) {
    resetState();
    return {
      tab,
      comments,
      summary: getSummary(),
      metrics: summarizeResults([]),
      results: [],
      topComments: state.topComments,
    };
  }

  // Build a set of comment texts that have already been analyzed
  // so we can skip them and avoid wasting API calls.
  const alreadyAnalyzed = new Set(state.analyzedResults.map((result) => result.text));

  const newComments = comments.filter((comment) => !alreadyAnalyzed.has(comment.text));

  // Track all extracted comments (for state reference)
  state.allExtractedComments = comments;

  if (newComments.length === 0) {
    // Everything was already analyzed — just rebuild metrics from cache
    const summary = getSummary();
    const metrics = summarizeResults(state.analyzedResults);

    return {
      tab,
      comments,
      summary,
      metrics,
      results: metrics.results,
      topComments: state.topComments,
    };
  }

  const totalCount = newComments.length;
  let batchIndex = 0;

  while (true) {
    const startIndex = batchIndex * state.BATCH_SIZE;
    const endIndex = Math.min(startIndex + state.BATCH_SIZE, totalCount);
    const batchComments = newComments.slice(startIndex, endIndex);

    if (!batchComments.length) break;

    const currentCount = Math.min(endIndex, totalCount);
    const progress = Math.round((currentCount / totalCount) * 100);

    onProgress?.(
      `Analyzing batch ${batchIndex + 1} of ${Math.ceil(
        totalCount / state.BATCH_SIZE
      )} (${progress}%)`
    );

    const texts = batchComments.map((comment) => comment.text);
    const batchResults = await analyzeBatch(texts);
    const summarizedBatch = summarizeResults(
      batchResults.map((result, index) => ({
        ...result,
        originalIndex: batchComments[index].originalIndex,
      }))
    ).results;

    addAnalyzedResults(summarizedBatch);
    batchIndex += 1;
  }

  const summary = getSummary();
  const metrics = summarizeResults(state.analyzedResults);

  return {
    tab,
    comments,
    summary,
    metrics,
    results: metrics.results,
    topComments: state.topComments,
  };
}
