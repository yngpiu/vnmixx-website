export const PRODUCT_CACHE_KEYS = {
  PRODUCT_ID: (id: number) => `prod:id:${id}`,
  PRODUCT_LIST: (hash: string) => `prod:list:${hash}`,
  COLOR_FACET: (hash: string) => `prod:cf:${hash}`,
  SIZE_FACET: (hash: string) => `prod:sf:${hash}`,
} as const;

export const PRODUCT_CACHE_PATTERNS = {
  ALL_PRODUCT_LISTS: 'prod:list:*',
  ALL_COLOR_FACETS: 'prod:cf:*',
  ALL_SIZE_FACETS: 'prod:sf:*',
} as const;

export const PRODUCT_CACHE_TTL = {
  PRODUCT_DETAIL: 300,
  PRODUCT_LIST: 60,
  COLOR_FACET: 60,
  SIZE_FACET: 60,
} as const;
