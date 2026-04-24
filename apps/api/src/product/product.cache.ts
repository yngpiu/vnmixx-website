export const PRODUCT_CACHE_KEYS = {
  PRODUCT_SLUG: (slug: string) => `prod:slug:${slug}`,
  PRODUCT_LIST: (hash: string) => `prod:list:${hash}`,
} as const;

export const PRODUCT_CACHE_PATTERNS = {
  ALL_PRODUCT_LISTS: 'prod:list:*',
} as const;

export const PRODUCT_CACHE_TTL = {
  PRODUCT_DETAIL: 300,
  PRODUCT_LIST: 60,
} as const;
