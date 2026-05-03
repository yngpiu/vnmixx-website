export const WISHLIST_CACHE_KEYS = {
  LIST: (customerId: number, page: number, limit: number) =>
    `wishlist:list:${customerId}:page:${page}:limit:${limit}`,
  LIST_PATTERN: (customerId: number) => `wishlist:list:${customerId}:*`,
} as const;

export const WISHLIST_CACHE_TTL = {
  LIST: 3_600, // 1 hour
} as const;
