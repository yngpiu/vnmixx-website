import { Injectable, Logger } from '@nestjs/common';
import type { ShopContentKey } from '../../../generated/prisma/client';
import { RedisService } from '../../redis/services/redis.service';
import { ShopContentRepository } from '../repositories/shop-content.repository';
import { SHOP_CONTENT_CACHE_KEYS, SHOP_CONTENT_CACHE_TTL } from '../shop-content.cache';

@Injectable()
export class PolicyAiSearchService {
  private readonly logger = new Logger(PolicyAiSearchService.name);

  constructor(
    private readonly shopContentRepository: ShopContentRepository,
    private readonly redis: RedisService,
  ) {}

  async getByKey(key: ShopContentKey): Promise<{ title: string; content: string } | null> {
    const startedAt = Date.now();
    const row = await this.redis.getOrSet(
      SHOP_CONTENT_CACHE_KEYS.DETAIL(key),
      SHOP_CONTENT_CACHE_TTL.CONTENT,
      () => this.shopContentRepository.findByKey(key),
    );
    this.logger.log(
      `[policy-ai] key=${key} found=${row ? 1 : 0} duration=${Date.now() - startedAt}ms`,
    );
    if (!row) return null;
    return { title: row.title, content: row.content };
  }
}
