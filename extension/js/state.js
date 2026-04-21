export const state = {
  analysisResponse: null,
  activeFilter: 'all',
  lastRunMeta: null,
};

export function resetState() {
  state.analysisResponse = null;
  state.lastRunMeta = null;
  state.activeFilter = 'all';
}

export function setAnalysisResponse(response, meta = {}) {
  state.analysisResponse = response;
  state.lastRunMeta = meta;
}

export function getAnalyzedComments() {
  return state.analysisResponse?.comments || [];
}

export function getFilteredComments(filter = state.activeFilter) {
  const comments = getAnalyzedComments();
  if (filter === 'all') {
    return comments;
  }
  return comments
    .filter((comment) => comment.top_signal?.key === filter)
    .sort((a, b) => (b.top_signal?.score || 0) - (a.top_signal?.score || 0));
}
