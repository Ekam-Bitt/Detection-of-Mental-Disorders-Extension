import {
  LABELS,
  LABEL_ORDER,
  BATCH_SIZE,
  DEFAULT_SHIELD_THRESHOLD,
} from '../config.js';

export const state = {
  analyzedResults: [],
  topComments: {},
  allExtractedComments: [],
  currentBatch: 0,
  BATCH_SIZE,
  activeFilter: 'all',
  shieldEnabled: false,
  shieldThreshold: DEFAULT_SHIELD_THRESHOLD,
};

export function resetState() {
  state.analyzedResults = [];
  state.topComments = {};
  LABEL_ORDER.forEach((label) => {
    state.topComments[label] = null;
  });
  state.allExtractedComments = [];
  state.currentBatch = 0;
  state.shieldEnabled = false;
  state.shieldThreshold = DEFAULT_SHIELD_THRESHOLD;
}

export function addAnalyzedResults(results) {
  state.analyzedResults.push(...results);
  updateTopComments(results);
}

function updateTopComments(batchResults) {
  batchResults.forEach((result) => {
    if (result.predictions && result.predictions.length > 0) {
      const topPrediction = result.predictions.reduce((prev, current) =>
        prev.score > current.score ? prev : current
      );
      const label = topPrediction.label;
      if (
        !state.topComments[label] ||
        topPrediction.score > state.topComments[label].score
      ) {
        state.topComments[label] = {
          text: result.text,
          score: topPrediction.score,
          originalIndex: result.originalIndex,
        };
      }
    }
  });
}

export function getSummary() {
  const summary = {};
  LABEL_ORDER.forEach((label) => {
    summary[label] = 0;
  });

  state.analyzedResults.forEach(({ predictions }) => {
    if (!predictions || predictions.length === 0) return;
    const top = predictions.reduce((prev, current) =>
      prev.score > current.score ? prev : current
    );
    if (summary.hasOwnProperty(top.label)) {
      summary[top.label]++;
    }
  });
  return summary;
}
