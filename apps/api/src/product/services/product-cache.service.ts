import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { CACHE_KEYS, CACHE_PATTERNS } from '../../redis/cache-keys';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class ProductCacheService {
  constructor(private readonly redis: RedisService) {}

  async invalidateProductCache(slug: string): Promise<void> {
    await Promise.all([
      this.redis.del(CACHE_KEYS.PRODUCT_SLUG(slug)),
      this.redis.deleteByPattern(CACHE_PATTERNS.ALL_PRODUCT_LISTS),
    ]);
  }

  async deleteSlugCache(slug: string): Promise<void> {
    await this.redis.del(CACHE_KEYS.PRODUCT_SLUG(slug));
  }

  hashQuery(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .filter((k) => params[k] !== undefined)
      .sort()
      .map((k) => {
        const v = params[k];
        return `${k}=${Array.isArray(v) ? (v as unknown[]).sort().join(',') : String(v)}`;
      })
      .join('&');
    return createHash('sha256').update(sorted).digest('hex').slice(0, 8);
  }
}
