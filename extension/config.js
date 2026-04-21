export const DEFAULT_API_BASE_URL = 'http://localhost:8000';
export const API_TIMEOUT = 60000;
export const MAX_COMMENT_LENGTH = 5000;
export const MAX_COMMENTS_PER_REQUEST = 100;
export const BATCH_SIZE = 30;

export const SUPPORTED_DOMAINS = [
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

export const SUPPORTED_MATCH_PATTERNS = [
  '*://*.youtube.com/*',
  '*://*.reddit.com/*',
  '*://*.twitter.com/*',
  '*://*.x.com/*',
];

export const NORMAL_LABEL = 'LABEL_6';
export const HISTORY_RETENTION_DAYS = 14;
export const MAX_HISTORY_ENTRIES = 500;
export const MIN_TRACKED_DURATION_MS = 10000;
export const DASHBOARD_WINDOW_DAYS = 7;
export const HIGH_RISK_SCORE = 0.68;
export const EXTREME_RISK_SCORE = 0.84;
export const VOLATILITY_SWING_THRESHOLD = 0.45;
export const VOLATILITY_AVERAGE_THRESHOLD = 0.3;
export const PAGE_RABBIT_HOLE_THRESHOLD = 0.62;
export const PAGE_RABBIT_HOLE_RATIO = 0.45;
export const MAX_AUTO_ANALYZE_COMMENTS = 24;
export const AUTO_ANALYZE_DEBOUNCE_MS = 1400;
export const BREATHER_DURATION_MS = 5 * 60 * 1000;

export const WELLBEING_SETTINGS_KEY = 'wellbeingSettings';
export const WELLBEING_HISTORY_KEY = 'wellbeingHistory';

export const DEFAULT_WELLBEING_SETTINGS = {
  shieldEnabled: true,
  shieldThreshold: 0.62,
  nudgesEnabled: true,
  resourcePromptsEnabled: true,
};

export const LABELS = {
  LABEL_0: { name: 'ADHD', color: '#38bdf8' },
  LABEL_1: { name: 'Anxiety', color: '#fb923c' },
  LABEL_2: { name: 'Autism', color: '#facc15' },
  LABEL_3: { name: 'BPD', color: '#f472b6' },
  LABEL_4: { name: 'Depression', color: '#8b5cf6' },
  LABEL_5: { name: 'PTSD', color: '#ef4444' },
  LABEL_6: { name: 'Normal', color: '#22c55e' },
};

export const LABEL_ORDER = [
  'LABEL_0',
  'LABEL_1',
  'LABEL_2',
  'LABEL_3',
  'LABEL_4',
  'LABEL_5',
  'LABEL_6',
];

export const DISTRESS_WEIGHTS = {
  LABEL_0: 0.4,
  LABEL_1: 0.72,
  LABEL_2: 0.35,
  LABEL_3: 0.88,
  LABEL_4: 0.82,
  LABEL_5: 0.76,
  LABEL_6: 0,
};

export const HIGH_RISK_KEYWORDS = [
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

export const DRAFT_FIELD_SELECTORS = [
  'textarea',
  "input[type='search']",
  "input[type='text']",
  '[contenteditable="true"]',
];

export const COMMENT_SELECTORS = {
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

export const SUPPORT_RESOURCES = {
  india: {
    name: 'Tele-MANAS',
    primaryLabel: 'Call 14416',
    primaryHref: 'tel:14416',
    secondaryLabel: 'Call 1800-891-4416',
    secondaryHref: 'tel:18008914416',
    helperText: '24/7 tele-mental health support in India.',
  },
  unitedStates: {
    name: '988 Lifeline',
    primaryLabel: 'Call or Text 988',
    primaryHref: 'tel:988',
    secondaryLabel: 'Open 988 chat',
    secondaryHref: 'https://988lifeline.org/get-help/',
    helperText: '24/7 crisis support across the United States and territories.',
  },
  fallback: {
    name: 'Immediate Support',
    primaryLabel: 'Find crisis support',
    primaryHref: 'https://988lifeline.org/get-help/',
    secondaryLabel: 'Contact emergency services',
    secondaryHref: '#',
    helperText: 'Reach out to local emergency services or a trusted person right now.',
  },
};
