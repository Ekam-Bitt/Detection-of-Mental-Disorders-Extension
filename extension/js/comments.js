import { analyzeBatch } from './api.js';
import { state, resetState, addAnalyzedResults, getSummary } from './state.js';
import * as ui from './ui.js';
import { renderChart } from './chart.js';

export async function extractAndAnalyze() {
  resetState();
  ui.toggleCommentsContainer(false);
  ui.showLoader('Extracting comments from page...');

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  try {
    const results = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
        allFrames: true,
      },
      files: ['content.js'],
    });

    if (!results || results.length === 0) {
      throw new Error('No frames returned a result from the script');
    }

    const comments = results.reduce((acc, frame) => {
      if (Array.isArray(frame.result)) {
        return acc.concat(frame.result);
      }
      return acc;
    }, []);

    state.allExtractedComments = comments;

    if (state.allExtractedComments.length === 0) {
      ui.showLoader('No comments found on this page.');
      return;
    }

    ui.showLoader(
      `Found ${state.allExtractedComments.length} comments. Starting analysis...`
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Auto-process all batches sequentially
    await processAllBatches();
  } catch (error) {
    console.error('Extraction error:', error);
    ui.showLoader(`Failed to extract comments: ${error.message}`);
  }
}

async function processAllBatches() {
  const totalCount = state.allExtractedComments.length;

  while (true) {
    const startIdx = state.currentBatch * state.BATCH_SIZE;
    const endIdx = Math.min(startIdx + state.BATCH_SIZE, totalCount);
    const batchComments = state.allExtractedComments.slice(startIdx, endIdx);

    if (batchComments.length === 0) break;

    const currentCount = Math.min(endIdx, totalCount);
    const progress = Math.round((currentCount / totalCount) * 100);

    ui.showLoader(
      `Analyzing batch ${
        state.currentBatch + 1
      }<br>${currentCount}/${totalCount} comments (${progress}%)`
    );

    try {
      const texts = batchComments.map((c) => c.text);
      const batchResults = await analyzeBatch(texts);

      const resultsWithIndex = batchResults.map((result, i) => ({
        ...result,
        originalIndex: batchComments[i].originalIndex,
      }));

      addAnalyzedResults(resultsWithIndex);
      state.currentBatch++;

      // Update summary counts after each batch
      const summary = getSummary();
      ui.updateSummary(summary);
    } catch (error) {
      console.error('Batch analysis error:', error);
      const message =
        error.name === 'AbortError'
          ? 'Request timed out. The server may be overloaded — try again.'
          : `Analysis failed: ${error.message}`;
      ui.showLoader(`❌ ${message}`);
      return;
    }
  }

  // All batches done — render final results
  const summary = getSummary();
  ui.updateSummary(summary);
  ui.hideLoader();
  renderChart(summary);
  ui.showResultsContainers();

  // Show all results by default
  document.querySelector(`.filter-btn[data-filter="${state.activeFilter}"]`)?.click();
}
