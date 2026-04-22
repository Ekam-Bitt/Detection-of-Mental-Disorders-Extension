import { analyzeBatch } from './api.js';
import { summarizeResults } from './analysis.js';
import { addAnalyzedResults, getSummary, resetState, state } from './state.js';

export async function extractAndAnalyze({ onProgress } = {}) {
  resetState();

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

  state.allExtractedComments = comments;

  if (!comments.length) {
    return {
      tab,
      comments,
      summary: getSummary(),
      metrics: summarizeResults([]),
      results: [],
      topComments: state.topComments,
    };
  }

  const totalCount = comments.length;

  while (true) {
    const startIndex = state.currentBatch * state.BATCH_SIZE;
    const endIndex = Math.min(startIndex + state.BATCH_SIZE, totalCount);
    const batchComments = comments.slice(startIndex, endIndex);

    if (!batchComments.length) break;

    const currentCount = Math.min(endIndex, totalCount);
    const progress = Math.round((currentCount / totalCount) * 100);

    onProgress?.(
      `Analyzing batch ${state.currentBatch + 1} of ${Math.ceil(
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
    state.currentBatch += 1;
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
