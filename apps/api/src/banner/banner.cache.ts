export const BANNER_CACHE_KEYS = {
  buildPublicListKey: (placement?: 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP'): string =>
    placement ? `banner:list:public:${placement}` : 'banner:list:public:all',
} as const;

export const BANNER_CACHE_PATTERNS = {
  ALL_BANNERS: 'banner:*',
} as const;

export const BANNER_CACHE_TTL = {
  BANNER: 600,
} as const;
