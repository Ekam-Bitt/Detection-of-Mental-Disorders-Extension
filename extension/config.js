export const DEFAULT_API_BASE_URL = 'http://localhost:8000';
export const API_TIMEOUT = 60000;
export const MAX_COMMENT_LENGTH = 5000;
export const MAX_COMMENTS_PER_REQUEST = 100;
export const BATCH_SIZE = 30;
export const DEFAULT_SHIELD_THRESHOLD = 0.3;
export const SHIELD_STORAGE_KEY = 'shieldSettings';
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
export const LABELS = {
  LABEL_0: { name: 'ADHD', color: '#0ea5e9' },
  LABEL_1: { name: 'Anxiety', color: '#f97316' },
  LABEL_2: { name: 'Autism', color: '#eab308' },
  LABEL_3: { name: 'BPD', color: '#ec4899' },
  LABEL_4: { name: 'Depression', color: '#7c3aed' },
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
