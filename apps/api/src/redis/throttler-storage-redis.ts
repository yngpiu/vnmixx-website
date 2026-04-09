import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';
import { CACHE_KEYS } from './cache-keys';

@Injectable()
export class ThrottlerStorageRedis implements ThrottlerStorage, OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
    this.redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 20 });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = CACHE_KEYS.THROTTLE(key);
    const ttlSeconds = Math.ceil(ttl / 1000);

    const totalHits = await this.redis.incr(redisKey);
    if (totalHits === 1) {
      await this.redis.expire(redisKey, ttlSeconds);
    }

    const pttl = await this.redis.pttl(redisKey);
    const timeToExpire = pttl > 0 ? pttl : ttl;

    const isBlocked = totalHits > limit;
    let timeToBlockExpire = 0;

    if (isBlocked && blockDuration > 0) {
      const blockKey = CACHE_KEYS.THROTTLE_BLOCK(key);
      const blockSeconds = Math.ceil(blockDuration / 1000);
      const wasSet = await this.redis.set(blockKey, '1', 'EX', blockSeconds, 'NX');
      if (!wasSet) {
        const blockPttl = await this.redis.pttl(blockKey);
        timeToBlockExpire = blockPttl > 0 ? blockPttl : 0;
      } else {
        timeToBlockExpire = blockDuration;
      }
    }

    return { totalHits, timeToExpire, isBlocked, timeToBlockExpire };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
