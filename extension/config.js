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
export const LABELS = {
  LABEL_0: { name: 'ADHD', color: '#3b82f6' },
  LABEL_1: { name: 'Anxiety', color: '#10b981' },
  LABEL_2: { name: 'Autism', color: '#f59e0b' },
  LABEL_3: { name: 'BPD', color: '#dc2626' },
  LABEL_4: { name: 'Depression', color: '#6366f1' },
  LABEL_5: { name: 'PTSD', color: '#8b5cf6' },
  LABEL_6: { name: 'Normal', color: '#6b7280' },
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
