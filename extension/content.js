(async () => {
  const MAX_COMMENT_LENGTH = 5000;
  const MIN_COMMENT_WORDS = 5;
  const SUPPORTED_DOMAINS = ['youtube.com', 'reddit.com', 'x.com', 'twitter.com'];
  const TIMEOUT = 10000;

  function normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim().slice(0, MAX_COMMENT_LENGTH);
  }

  function normalizeElements(elements, source) {
    const seen = new Set();

    return Array.from(elements)
      .map((el) => normalizeText(el.innerText || el.textContent || ''))
      .filter((text) => text && text.split(/\s+/).length >= MIN_COMMENT_WORDS)
      .filter((text) => {
        const key = text.toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map((text, index) => ({
        text,
        originalIndex: index,
        source,
      }));
  }

  // ---------- Selectors ----------
  const REDDIT_SELECTORS = [
    "div[data-testid='comment'] p", // New Reddit (user provided)
    'shreddit-comment-body', // Modern Reddit Shadow DOM
    '.Post ._292iotee39Lmt0MkQZ2hPV', // Old New Reddit (?)
    "div[data-testid='post-container'] p", // Post body
    "div[id$='-post-rtjson-content']", // Target container to group paragraphs
    "div[class*='text-neutral-content']", // Target container to group paragraphs
  ];

  const YOUTUBE_SELECTORS = [
    'ytd-comment-thread-renderer #content-text',
    'ytd-comment-thread-renderer ytd-comment-renderer #content-text',
    'ytd-comment-view-model #content-text',
    'ytd-comment-thread-renderer yt-attributed-string#content-text',
    'ytd-comment-thread-renderer span.yt-core-attributed-string',
  ];

  const X_SELECTORS = ["article div[data-testid='tweetText']", 'article div[lang]'];

  function getSelectors(host) {
    if (host.includes('youtube.com')) return YOUTUBE_SELECTORS;
    if (host.includes('reddit.com')) return REDDIT_SELECTORS;
    if (host.includes('x.com') || host.includes('twitter.com')) return X_SELECTORS;
    return [];
  }

  function getSource(host) {
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('reddit.com')) return 'reddit';
    if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
    return 'unknown';
  }

  // ---------- Async Waiter ----------
  function scanWithSelectors(selectors) {
    const elements = new Set();
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => elements.add(el));
    });
    return elements;
  }

  function waitForComments(selectors, timeout) {
    return new Promise((resolve) => {
      // Check immediately
      let elements = scanWithSelectors(selectors);
      if (elements.size > 0) {
        resolve(elements);
        return;
      }

      // Observe
      const observer = new MutationObserver(() => {
        elements = scanWithSelectors(selectors);
        if (elements.size > 0) {
          observer.disconnect();
          resolve(elements);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Timeout
      setTimeout(() => {
        observer.disconnect();
        resolve(scanWithSelectors(selectors));
      }, timeout);
    });
  }

  async function ensureYoutubeCommentsVisible() {
    if (!window.location.hostname.includes('youtube.com')) {
      return;
    }

    const commentsSection = document.querySelector('#comments');
    if (commentsSection) {
      commentsSection.scrollIntoView({ block: 'start', behavior: 'auto' });
    } else {
      window.scrollBy(0, Math.max(window.innerHeight, 800));
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // ---------- Main Execution ----------
  const host = window.location.hostname;

  const isSupported = SUPPORTED_DOMAINS.some((domain) => host.includes(domain));

  if (!isSupported) {
    console.warn(`Mental Disorder Detector: ${host} is not a supported domain`);
    return [];
  }

  const selectors = getSelectors(host);

  if (selectors.length === 0) {
    console.warn(`Mental Disorder Detector: No selectors found for ${host}`);
    return [];
  }

  await ensureYoutubeCommentsVisible();

  const foundElements = await waitForComments(selectors, TIMEOUT);
  const source = getSource(host);
  const comments = normalizeElements(foundElements, source);

  return comments;
})();
