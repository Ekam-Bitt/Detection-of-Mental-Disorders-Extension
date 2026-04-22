import {
  MAX_AUTO_ANALYZE_COMMENTS,
  MIN_TRACKED_DURATION_MS,
  SUPPORT_RESOURCES,
  SUPPORTED_DOMAINS,
} from './config.js';
import { analyzeBatch } from './js/api.js';
import { summarizeResults } from './js/analysis.js';
import {
  getSupportResource as fetchSupportResource,
  postEvent,
} from './js/backend-api.js';
import { ensureWellbeingState, loadWellbeingSettings } from './js/wellbeing-storage.js';

const tabSessions = new Map();
let activeTabId = null;

initialize();

chrome.runtime.onInstalled.addListener(() => {
  initialize();
});

chrome.runtime.onStartup.addListener(() => {
  initialize();
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await switchActiveTab(tabId);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await persistTabTime(tabId);
  tabSessions.delete(tabId);
  if (activeTabId === tabId) activeTabId = null;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const session = getOrCreateSession(tabId);

  if (changeInfo.url && activeTabId === tabId) {
    await persistTabTime(tabId);
  }

  if (tab) updateSessionMeta(session, tab);

  if (changeInfo.status === 'loading') {
    session.riskScore = null;
    session.toxicRatio = 0;
    session.totalComments = 0;
    session.lastActivatedAt = activeTabId === tabId ? Date.now() : null;
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    if (activeTabId !== null) {
      await persistTabTime(activeTabId);
      activeTabId = null;
    }
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab?.id) {
    await switchActiveTab(tab.id);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE_SAMPLE') {
    handleAnalyzePageSample(message.payload, sender)
      .then((response) => sendResponse({ ok: true, ...response }))
      .catch((error) => {
        console.error('Auto page analysis failed:', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'MANUAL_ANALYSIS_CAPTURED') {
    handleManualAnalysis(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error('Manual analysis sync failed:', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'GET_SUPPORT_RESOURCES') {
    getSupportResource(message.payload || {})
      .then((resource) => sendResponse({ ok: true, resource }))
      .catch((error) => {
        console.error('Support resource lookup failed:', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'GET_CURRENT_SESSION') {
    const session = activeTabId ? tabSessions.get(activeTabId) : null;
    sendResponse({ ok: true, session: session || null });
    return true;
  }

  return false;
});

async function initialize() {
  try {
    await ensureWellbeingState();
  } catch (error) {
    console.error('Failed to warm wellbeing state from backend:', error);
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (activeTab?.id) {
    await switchActiveTab(activeTab.id);
  }
}

function isSupportedUrl(url = '') {
  return SUPPORTED_DOMAINS.some((domain) => url.includes(domain));
}

function getOrCreateSession(tabId) {
  if (!tabSessions.has(tabId)) {
    tabSessions.set(tabId, {
      tabId,
      url: '',
      title: '',
      host: '',
      riskScore: null,
      toxicRatio: 0,
      totalComments: 0,
      lastActivatedAt: null,
      latestMetrics: null,
    });
  }

  return tabSessions.get(tabId);
}

function updateSessionMeta(session, tab) {
  session.url = tab.url || session.url;
  session.title = tab.title || session.title;
  session.host = safeHost(session.url);
}

async function switchActiveTab(nextTabId) {
  if (activeTabId === nextTabId) {
    const session = getOrCreateSession(nextTabId);
    if (!session.lastActivatedAt && isSupportedUrl(session.url)) {
      session.lastActivatedAt = Date.now();
    }
    return;
  }

  if (activeTabId !== null) {
    await persistTabTime(activeTabId);
  }

  activeTabId = nextTabId;
  const tab = await chrome.tabs.get(nextTabId).catch(() => null);
  if (!tab) return;

  const session = getOrCreateSession(nextTabId);
  updateSessionMeta(session, tab);
  session.lastActivatedAt = isSupportedUrl(session.url) ? Date.now() : null;
}

async function persistTabTime(tabId) {
  const session = tabSessions.get(tabId);
  if (!session?.lastActivatedAt) return;

  const durationMs = Date.now() - session.lastActivatedAt;
  session.lastActivatedAt = null;

  if (
    !isSupportedUrl(session.url) ||
    session.riskScore === null ||
    durationMs < MIN_TRACKED_DURATION_MS
  ) {
    return;
  }

  try {
    await postEvent({
      timestamp: new Date().toISOString(),
      durationMs,
      riskScore: session.riskScore,
      riskBand:
        session.riskScore >= 0.68
          ? 'high'
          : session.riskScore >= 0.4
            ? 'guarded'
            : 'calm',
      toxicRatio: session.toxicRatio,
      totalComments: session.totalComments,
      url: session.url,
      host: session.host,
      title: session.title,
      source: 'extension',
      kind: 'browsing_session',
      excerpt: session.title,
    });
  } catch (error) {
    console.error('Failed to sync browsing session:', error);
  }
}

async function handleAnalyzePageSample(payload, sender) {
  const sample = Array.isArray(payload.comments)
    ? payload.comments.slice(0, MAX_AUTO_ANALYZE_COMMENTS)
    : [];

  if (!sample.length) {
    return {
      commentAnalyses: [],
      metrics: summarizeResults([]),
      settings: await loadWellbeingSettings(),
    };
  }

  const analyzed = await analyzeBatch(sample.map((item) => item.text));
  const combined = analyzed.map((result, index) => ({
    ...result,
    id: sample[index].id,
    originalIndex: index,
  }));

  const metrics = summarizeResults(combined);
  const commentAnalyses = metrics.results.map((result) => ({
    id: result.id,
    riskScore: result.riskScore,
    riskBand: result.riskBand,
    topLabel: result.topPrediction?.label || null,
    topScore: result.topPrediction?.score || 0,
  }));

  if (sender.tab?.id) {
    const session = getOrCreateSession(sender.tab.id);
    updateSessionMeta(session, {
      url: payload.url || sender.tab.url,
      title: payload.title || sender.tab.title,
    });
    session.riskScore = metrics.averageRisk;
    session.toxicRatio = metrics.toxicRatio;
    session.totalComments = metrics.totalComments;
    session.latestMetrics = metrics;
  }

  return {
    commentAnalyses,
    metrics,
    settings: await loadWellbeingSettings(),
  };
}

async function handleManualAnalysis(payload) {
  if (!payload?.tabId) return;

  const session = getOrCreateSession(payload.tabId);
  updateSessionMeta(session, {
    url: payload.url,
    title: payload.title,
  });
  session.riskScore = payload.metrics?.averageRisk ?? session.riskScore;
  session.toxicRatio = payload.metrics?.toxicRatio ?? session.toxicRatio;
  session.totalComments = payload.metrics?.totalComments ?? session.totalComments;

  try {
    await postEvent({
      source: 'extension',
      kind: 'thread_scan',
      timestamp: new Date().toISOString(),
      title: payload.title || 'Current thread scan',
      url: payload.url,
      host: safeHost(payload.url),
      excerpt: payload.title || 'Current thread scan',
      riskScore: payload.metrics?.averageRisk ?? 0,
      riskBand:
        payload.metrics?.averageRisk >= 0.68
          ? 'high'
          : payload.metrics?.averageRisk >= 0.4
            ? 'guarded'
            : 'calm',
      toxicRatio: payload.metrics?.toxicRatio ?? 0,
      totalComments: payload.metrics?.totalComments ?? 0,
      topLabel: payload.metrics?.dominantLabel ?? null,
      summary: payload.metrics?.summary ?? {},
      metadata: {
        volatility: payload.metrics?.volatility ?? {},
      },
    });
  } catch (error) {
    console.error('Failed to sync thread scan:', error);
  }
}

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

async function getSupportResource({ locale = '', timeZone = '' }) {
  try {
    return await fetchSupportResource(locale, timeZone);
  } catch (error) {
    console.error('Failed to fetch support resource from backend:', error);
    const normalizedLocale = locale.toLowerCase();
    const normalizedZone = timeZone.toLowerCase();

    if (normalizedLocale.includes('in') || normalizedZone.includes('kolkata')) {
      return SUPPORT_RESOURCES.india;
    }

    if (normalizedLocale.includes('us') || normalizedZone.startsWith('america/')) {
      return SUPPORT_RESOURCES.unitedStates;
    }

    return SUPPORT_RESOURCES.fallback;
  }
}
