(async () => {
  const SUPPORTED_DOMAINS = ['youtube.com', 'reddit.com', 'x.com', 'twitter.com'];
  const COMMENT_SELECTORS = {
    reddit: [
      "div[data-testid='comment'] p",
      'shreddit-comment-body',
      '.Post ._292iotee39Lmt0MkQZ2hPV',
      "div[data-testid='post-container'] p",
      "div[id$='-post-rtjson-content']",
      "div[class*='text-neutral-content']",
    ],
    youtube: [
      'ytd-comment-thread-renderer #content-text',
      'ytd-comment-thread-renderer ytd-comment-renderer #content-text',
      'ytd-comment-view-model #content-text',
    ],
    x: ["article div[data-testid='tweetText']", 'article div[lang]'],
  };
  const DRAFT_SELECTORS = [
    'textarea',
    "input[type='search']",
    "input[type='text']",
    '[contenteditable="true"]',
  ];
  const HIGH_RISK_KEYWORDS = [
    'want to die',
    'kill myself',
    'end my life',
    'self harm',
    'self-harm',
    'suicidal',
    'suicide',
    'no reason to live',
    'hopeless',
    'i give up',
    'harm myself',
    'want to disappear',
    'can’t do this anymore',
    "can't do this anymore",
    'life is pointless',
  ];
  const DEFAULT_SETTINGS = {
    shieldEnabled: true,
    shieldThreshold: 0.62,
    nudgesEnabled: true,
    resourcePromptsEnabled: true,
  };
  const SETTINGS_KEY = 'wellbeingSettings';
  const ANALYZE_DEBOUNCE_MS = 1400;
  const MAX_COMMENT_SAMPLE = 24;
  const BREATHER_DURATION_MS = 5 * 60 * 1000;
  const MIN_WORDS = 8;

  const state = {
    settings: { ...DEFAULT_SETTINGS },
    lastFingerprint: '',
    analysisTimer: null,
    draftTimer: null,
    supportResource: null,
    latestAnalyses: new Map(),
    pauseUntil: 0,
    nudgeDismissed: false,
  };

  const host = window.location.hostname;
  if (!SUPPORTED_DOMAINS.some((domain) => host.includes(domain))) return;

  await initialize();

  async function initialize() {
    await loadSettings();
    state.supportResource = await getSupportResource();
    injectInteractionHooks();
    scheduleAnalysis();
    attachDraftListeners();

    const observer = new MutationObserver(() => {
      attachDraftListeners();
      scheduleAnalysis();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) scheduleAnalysis(true);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[SETTINGS_KEY]) return;
      state.settings = {
        ...DEFAULT_SETTINGS,
        ...(changes[SETTINGS_KEY].newValue || {}),
      };
      applyShielding(collectCommentCandidates());
      if (!state.settings.resourcePromptsEnabled) {
        hideSupportPrompt();
      }
    });
  }

  async function loadSettings() {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    state.settings = {
      ...DEFAULT_SETTINGS,
      ...(result[SETTINGS_KEY] || {}),
    };
  }

  function injectInteractionHooks() {
    document.addEventListener(
      'scroll',
      () => {
        scheduleAnalysis();
      },
      { passive: true }
    );
  }

  function getSelectorsForHost() {
    if (host.includes('youtube.com')) return COMMENT_SELECTORS.youtube;
    if (host.includes('reddit.com')) return COMMENT_SELECTORS.reddit;
    if (host.includes('x.com') || host.includes('twitter.com'))
      return COMMENT_SELECTORS.x;
    return [];
  }

  function collectCommentCandidates() {
    const selectors = getSelectorsForHost();
    const seen = new Set();

    return selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .map((element, index) => {
        const text = normalizeText(element.innerText || element.textContent || '');
        if (!text || text.split(/\s+/).length < MIN_WORDS) return null;

        const id = element.dataset.mwgCommentId || buildStableId(text, index);
        element.dataset.mwgCommentId = id;
        const signature = `${id}:${text.length}`;
        if (seen.has(signature)) return null;
        seen.add(signature);

        return {
          id,
          element,
          text,
        };
      })
      .filter(Boolean)
      .slice(0, MAX_COMMENT_SAMPLE);
  }

  function normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim().slice(0, 5000);
  }

  function buildStableId(text, index) {
    const seed = `${text.slice(0, 80)}:${index}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return `mwg-${Math.abs(hash)}`;
  }

  function scheduleAnalysis(force = false) {
    window.clearTimeout(state.analysisTimer);
    state.analysisTimer = window.setTimeout(
      () => runAnalysis(force),
      ANALYZE_DEBOUNCE_MS
    );
  }

  async function runAnalysis(force = false) {
    if (document.hidden) return;

    const candidates = collectCommentCandidates();
    if (!candidates.length) return;

    const fingerprint = candidates
      .map((candidate) => `${candidate.id}:${candidate.text.length}`)
      .join('|');
    if (!force && fingerprint === state.lastFingerprint) {
      applyShielding(candidates);
      return;
    }

    state.lastFingerprint = fingerprint;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_PAGE_SAMPLE',
        payload: {
          url: location.href,
          title: document.title,
          comments: candidates.map(({ id, text }) => ({ id, text })),
        },
      });

      if (!response?.ok) return;

      state.latestAnalyses = new Map(
        response.commentAnalyses.map((item) => [item.id, item])
      );
      applyShielding(candidates);

      if (
        state.settings.nudgesEnabled &&
        response.metrics?.rabbitHoleLikely &&
        !state.nudgeDismissed
      ) {
        showNudge(response.metrics);
      }
    } catch (error) {
      console.error('Page monitor analysis failed:', error);
    }
  }

  function applyShielding(candidates) {
    const shouldPauseThread = state.pauseUntil > Date.now();

    candidates.forEach(({ id, element }) => {
      const analysis = state.latestAnalyses.get(id);
      if (!analysis) return;

      const shouldShield =
        (state.settings.shieldEnabled &&
          analysis.riskScore >= state.settings.shieldThreshold) ||
        (shouldPauseThread && analysis.riskScore >= 0.4);

      element.classList.toggle('mwg-shielded', shouldShield);
      if (!shouldShield) {
        element.classList.remove('mwg-revealed');
        element.removeAttribute('data-mwg-badge');
      } else {
        element.setAttribute(
          'data-mwg-badge',
          shouldPauseThread
            ? 'Breather mode on. Click to reveal.'
            : 'Shielded. Click to reveal.'
        );
      }

      if (!element.dataset.mwgRevealBound) {
        element.dataset.mwgRevealBound = 'true';
        element.addEventListener('click', () => {
          if (element.classList.contains('mwg-shielded')) {
            element.classList.add('mwg-revealed');
          }
        });
      }
    });
  }

  function showNudge(metrics) {
    let panel = document.getElementById('mwgNudge');
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'mwgNudge';
      panel.className = 'mwg-floating-panel';
      panel.innerHTML = `
        <div class="mwg-panel-kicker">Digital Safety Net</div>
        <h3>This thread looks unusually intense.</h3>
        <p id="mwgNudgeCopy"></p>
        <div class="mwg-panel-actions">
          <button type="button" class="mwg-primary" id="mwgBreatherBtn">Take a 5-minute breather</button>
          <button type="button" class="mwg-secondary" id="mwgDismissNudge">Keep browsing</button>
        </div>
      `;
      document.body.appendChild(panel);

      panel.querySelector('#mwgBreatherBtn')?.addEventListener('click', () => {
        state.pauseUntil = Date.now() + BREATHER_DURATION_MS;
        state.nudgeDismissed = true;
        panel.querySelector('h3').textContent = 'Breather mode is on.';
        panel.querySelector('#mwgNudgeCopy').textContent =
          'High-intensity comments will stay shielded for the next 5 minutes. Try one slow inhale for 4, hold for 4, exhale for 6.';
        panel.querySelector('.mwg-panel-actions').innerHTML =
          '<button type="button" class="mwg-secondary" id="mwgResumeNow">Resume now</button>';
        panel.querySelector('#mwgResumeNow')?.addEventListener('click', () => {
          state.pauseUntil = 0;
          panel.remove();
          scheduleAnalysis(true);
        });
        window.setTimeout(() => {
          if (Date.now() >= state.pauseUntil) {
            state.pauseUntil = 0;
            panel.remove();
            scheduleAnalysis(true);
          }
        }, BREATHER_DURATION_MS + 250);
        applyShielding(collectCommentCandidates());
      });

      panel.querySelector('#mwgDismissNudge')?.addEventListener('click', () => {
        state.nudgeDismissed = true;
        panel.remove();
      });
    }

    const copy = panel.querySelector('#mwgNudgeCopy');
    if (copy) {
      copy.textContent = `${Math.round(
        (metrics.toxicRatio || 0) * 100
      )}% of the sampled comments crossed the high-risk threshold.`;
    }
  }

  function attachDraftListeners() {
    document.querySelectorAll(DRAFT_SELECTORS.join(',')).forEach((field) => {
      if (field.dataset.mwgDraftBound) return;
      field.dataset.mwgDraftBound = 'true';
      field.addEventListener('input', () => {
        window.clearTimeout(state.draftTimer);
        state.draftTimer = window.setTimeout(() => handleDraftInput(field), 250);
      });
      field.addEventListener('blur', () => {
        window.setTimeout(() => hideSupportPrompt(), 200);
      });
    });
  }

  function handleDraftInput(field) {
    if (!state.settings.resourcePromptsEnabled) {
      hideSupportPrompt();
      return;
    }

    const value = field.matches('[contenteditable="true"]')
      ? field.innerText || ''
      : field.value || '';
    const normalized = normalizeText(value.toLowerCase());
    const hits = HIGH_RISK_KEYWORDS.filter((keyword) => normalized.includes(keyword));

    if (!hits.length) {
      hideSupportPrompt();
      return;
    }

    showSupportPrompt(hits);
  }

  function showSupportPrompt(hits) {
    const resource = state.supportResource || {
      name: 'Immediate Support',
      primaryLabel: 'Reach out now',
      primaryHref: '#',
      secondaryLabel: 'Talk to someone nearby',
      secondaryHref: '#',
      helperText: 'Contact local support or a trusted person immediately.',
    };

    let panel = document.getElementById('mwgSupportPrompt');
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'mwgSupportPrompt';
      panel.className = 'mwg-floating-panel mwg-support-panel';
      document.body.appendChild(panel);
    }

    panel.innerHTML = `
      <div class="mwg-panel-kicker">Support Prompt</div>
      <h3>Your draft suggests you may need support.</h3>
      <p>Detected phrases: ${hits.slice(0, 2).join(', ')}.</p>
      <div class="mwg-support-actions">
        <a class="mwg-primary" href="${
          resource.primaryHref
        }" target="_blank" rel="noreferrer">
          ${resource.primaryLabel}
        </a>
        <a class="mwg-secondary" href="${
          resource.secondaryHref
        }" target="_blank" rel="noreferrer">
          ${resource.secondaryLabel}
        </a>
      </div>
      <div class="mwg-support-footnote">
        ${resource.helperText} Try this grounding cycle: 4 seconds in, 4 hold, 6 out.
      </div>
    `;
  }

  function hideSupportPrompt() {
    document.getElementById('mwgSupportPrompt')?.remove();
  }

  async function getSupportResource() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SUPPORT_RESOURCES',
        payload: {
          locale: navigator.language,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response?.resource || null;
    } catch (error) {
      console.error('Failed to load support resource:', error);
      return null;
    }
  }
})();
