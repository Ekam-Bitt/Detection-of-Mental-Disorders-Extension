import { analyzeComments } from './api.js';
import { MAX_COMMENTS_PER_REQUEST } from '../config.js';
import {
  getFilteredComments,
  resetState,
  setAnalysisResponse,
  state,
} from './state.js';
import * as ui from './ui.js';
import { renderChart } from './chart.js';

export async function extractAndAnalyze() {
  resetState();
  ui.renderFilters();
  ui.showResultsContainers();
  ui.showLoader('Extracting visible comments from this page...');
  ui.setRunMeta({});

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

    const normalizedComments = comments
      .filter((comment) => typeof comment?.text === 'string' && comment.text.trim())
      .map((comment, index) => ({
        text: comment.text.trim(),
        source_platform: comment.source_platform || comment.source || 'reddit',
        thread_id: comment.thread_id || null,
        post_id: comment.post_id || `comment-${index}`,
        timestamp: comment.timestamp || null,
        originalIndex: comment.originalIndex ?? index,
      }));

    if (normalizedComments.length === 0) {
      ui.updateStatus('No visible comments were detected on this page.', 'warning');
      ui.renderSummary({
        comment_count: 0,
        average_confidence: 0,
        overall_uncertainty: 'high',
        insufficient_evidence: true,
        signal_prevalence: [],
      });
      renderChart([]);
      ui.renderEvidence({});
      ui.renderComments([], 'all');
      return;
    }

    const commentsToAnalyze = normalizedComments.slice(0, MAX_COMMENTS_PER_REQUEST);
    ui.updateStatus(
      `Analyzing ${commentsToAnalyze.length} comments with the local v2 signal model...`,
      'working'
    );

    const response = await analyzeComments(
      commentsToAnalyze.map((comment) => ({
        text: comment.text,
        source_platform: comment.source_platform,
        thread_id: comment.thread_id,
        post_id: comment.post_id,
        timestamp: comment.timestamp,
      }))
    );

    setAnalysisResponse(response, {
      detectedCount: normalizedComments.length,
      processedCount: response?.metadata?.total_processed || commentsToAnalyze.length,
      backend: response?.metadata?.backend || 'unknown',
    });

    ui.setRunMeta(state.lastRunMeta || {});
    ui.setDisclaimer(response?.metadata?.disclaimer || '');
    ui.renderSummary(response?.page_summary || {});
    renderChart(response?.page_summary?.signal_prevalence || []);
    ui.renderEvidence(response?.evidence || {});
    ui.updateStatus(
      response?.page_summary?.insufficient_evidence
        ? 'Analysis completed, but the page has limited evidence. Treat the summary cautiously.'
        : 'Analysis completed. Review the strongest signals, severity, and evidence below.',
      response?.page_summary?.insufficient_evidence ? 'warning' : 'success'
    );
    ui.renderComments(getFilteredComments(state.activeFilter), state.activeFilter);
  } catch (error) {
    console.error('Extraction error:', error);
    ui.updateStatus(`Analysis failed: ${error.message}`, 'error');
    ui.renderSummary({
      comment_count: 0,
      average_confidence: 0,
      overall_uncertainty: 'high',
      insufficient_evidence: true,
      signal_prevalence: [],
    });
    renderChart([]);
    ui.renderEvidence({});
    ui.renderComments([], state.activeFilter);
  }
}
