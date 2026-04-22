import { BATCH_SIZE, LABEL_ORDER } from '../config.js';

export const state = {
  analyzedResults: [],
  topComments: {},
  allExtractedComments: [],
  currentBatch: 0,
  activeFilter: 'all',
  BATCH_SIZE,
};

export function resetState() {
  state.analyzedResults = [];
  state.topComments = {};
  LABEL_ORDER.forEach((label) => {
    state.topComments[label] = null;
  });
  state.allExtractedComments = [];
  state.currentBatch = 0;
}

export function addAnalyzedResults(results) {
  state.analyzedResults.push(...results);
  updateTopComments(results);
}

function updateTopComments(batchResults) {
  batchResults.forEach((result) => {
    if (!result.topPrediction) return;

    const { label, score } = result.topPrediction;
    if (!state.topComments[label] || score > state.topComments[label].score) {
      state.topComments[label] = {
        text: result.text,
        score,
        originalIndex: result.originalIndex,
      };
    }
  });
}

export function getSummary() {
  const summary = {};
  LABEL_ORDER.forEach((label) => {
    summary[label] = 0;
  });

  state.analyzedResults.forEach(({ topPrediction }) => {
    if (
      topPrediction &&
      Object.prototype.hasOwnProperty.call(summary, topPrediction.label)
    ) {
      summary[topPrediction.label] += 1;
    }
  });

  return summary;
}
