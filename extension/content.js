(async () => {
  const MAX_COMMENT_LENGTH = 5000;
  const SUPPORTED_DOMAINS = [
    'youtube.com',
    'www.youtube.com',
    'reddit.com',
    'www.reddit.com',
    'old.reddit.com',
    'new.reddit.com',
    'x.com',
    'www.x.com',
    'twitter.com',
    'www.twitter.com',
  ];
  const TIMEOUT = 10000;

  function normalizeElements(elements, source) {
    return Array.from(elements)
      .map((el, index) => ({
        text: (el.innerText || '').trim(),
        originalIndex: index,
        source,
      }))
      .filter((item) => item.text && item.text.trim().split(/\s+/).length >= 15)
      .map((item) => ({
        ...item,
        text: item.text.slice(0, MAX_COMMENT_LENGTH),
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
  function waitForComments(selectors, timeout) {
    return new Promise((resolve) => {
      // Helper to find elements
      const scan = () => {
        const elements = new Set();
        selectors.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => elements.add(el));
        });
        return elements;
      };

      // Check immediately
      let elements = scan();
      if (elements.size > 0) {
        resolve(elements);
        return;
      }

      // Observe
      const observer = new MutationObserver(() => {
        elements = scan();
        if (elements.size > 0) {
          observer.disconnect();
          resolve(elements);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Timeout
      setTimeout(() => {
        observer.disconnect();
        resolve(scan()); // Return whatever we have (maybe empty)
      }, timeout);
    });
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

  const foundElements = await waitForComments(selectors, TIMEOUT);
  const source = getSource(host);
  const comments = normalizeElements(foundElements, source);

  return comments;
})();
