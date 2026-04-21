export const DEFAULT_API_BASE_URL = 'http://localhost:8000';
export const API_TIMEOUT = 120000;
export const MAX_COMMENT_LENGTH = 5000;
export const MAX_COMMENTS_PER_REQUEST = 100;
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
export const SIGNALS = [
  {
    key: 'attention_dysregulation',
    name: 'Attention Dysregulation',
    shortName: 'Attention',
    color: '#2d6cdf',
  },
  {
    key: 'anxious_affect',
    name: 'Anxious Affect',
    shortName: 'Anxiety',
    color: '#0f9d76',
  },
  {
    key: 'autistic_trait_discussion',
    name: 'Autistic Trait Discussion',
    shortName: 'Autistic Traits',
    color: '#d18c10',
  },
  {
    key: 'emotional_instability',
    name: 'Emotional Instability',
    shortName: 'Instability',
    color: '#cf4f39',
  },
  {
    key: 'depressive_affect',
    name: 'Depressive Affect',
    shortName: 'Depression',
    color: '#6058d8',
  },
  {
    key: 'trauma_stress',
    name: 'Trauma / Stress',
    shortName: 'Trauma',
    color: '#9856d6',
  },
  {
    key: 'crisis_self_harm',
    name: 'Crisis / Self-Harm',
    shortName: 'Crisis',
    color: '#d7263d',
  },
  {
    key: 'no_clear_signal',
    name: 'No Clear Signal',
    shortName: 'No Signal',
    color: '#6b7280',
  },
];

export const SIGNAL_MAP = Object.fromEntries(
  SIGNALS.map((signal) => [signal.key, signal])
);
