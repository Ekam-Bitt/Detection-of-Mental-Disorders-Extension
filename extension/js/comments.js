import { analyzeComments } from './api.js';
import { state, resetState, addAnalyzedResults, getSummary } from './state.js';
import * as ui from './ui.js';
import { renderChart } from './chart.js';

export async function extractAndAnalyze() {
  resetState();
  ui.toggleCommentsContainer(false);
  ui.toggleLoadMore(false);
  ui.updateSummary(getSummary());
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

    await new Promise((resolve) => setTimeout(resolve, 250));
    await processNextBatch();
  } catch (error) {
    console.error('Extraction error:', error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'loader';
    errorDiv.textContent = `Failed to extract comments: ${error.message}`;
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      chartContainer.innerHTML = '';
      chartContainer.appendChild(errorDiv);
    }
  }
}

export async function processNextBatch() {
  const startIdx = state.currentBatch * state.BATCH_SIZE;
  const endIdx = Math.min(
    startIdx + state.BATCH_SIZE,
    state.allExtractedComments.length
  );
  const batchComments = state.allExtractedComments.slice(startIdx, endIdx);

  if (batchComments.length === 0) {
    const summary = getSummary();
    ui.updateSummary(summary);
    ui.hideLoader();
    renderChart(summary);
    ui.showResultsContainers();
    document.querySelector(`.filter-btn[data-filter="${state.activeFilter}"]`)?.click();
    return;
  }

  const totalCount = state.allExtractedComments.length;
  const currentCount = Math.min(
    (state.currentBatch + 1) * state.BATCH_SIZE,
    totalCount
  );
  const progress = Math.round((currentCount / totalCount) * 100);
  ui.showLoader(
    `Analyzing batch ${
      state.currentBatch + 1
    }<br>${currentCount}/${totalCount} comments (${progress}%)`
  );
  ui.setLoadMoreState(true);

  try {
    const predictionsByComment = await analyzeComments(
      batchComments.map((comment) => comment.text)
    );
    const resultsWithIndex = predictionsByComment.map((predictions, i) => ({
      text: batchComments[i].text,
      predictions,
      originalIndex: batchComments[i].originalIndex,
    }));

    addAnalyzedResults(resultsWithIndex);
  } catch (error) {
    ui.showLoader(`Analysis failed: ${error.message}`);
    ui.setLoadMoreState(false);
    return;
  }

  state.currentBatch++;

  const remaining = totalCount - endIdx;
  if (remaining > 0) {
    await processNextBatch();
    return;
  }

  await processNextBatch();
}
