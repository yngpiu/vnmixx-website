export const REDIS_THROTTLER_CACHE_KEYS = {
  THROTTLE: (key: string) => `throttle:${key}`,
  THROTTLE_BLOCK: (key: string) => `throttle:${key}:blocked`,
} as const;
