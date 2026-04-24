export const CATEGORY_CACHE_KEYS = {
  CATEGORY_LIST: 'cat:list',
  CATEGORY_TREE: 'cat:tree',
  CATEGORY_SLUG: (slug: string) => `cat:slug:${slug}`,
} as const;

export const CATEGORY_CACHE_PATTERNS = {
  ALL_CATEGORIES: 'cat:*',
} as const;

export const CATEGORY_CACHE_TTL = {
  CATEGORY: 600,
} as const;
