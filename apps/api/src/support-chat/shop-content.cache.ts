import type { ShopContentKey } from '../../generated/prisma/client';

export const SHOP_CONTENT_CACHE_KEYS = {
  DETAIL: (key: ShopContentKey) => `shop-content:${key}`,
} as const;

export const SHOP_CONTENT_CACHE_TTL = {
  CONTENT: 86_400,
} as const;
