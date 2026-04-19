import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { CACHE_KEYS } from './cache-keys';
import { RedisService } from './redis.service';

@Injectable()
export class ThrottlerStorageRedis implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<ThrottlerStorageRecord> {
    const client = this.redis.getClient();
    const redisKey = CACHE_KEYS.THROTTLE(key);
    const ttlSeconds = Math.ceil(ttl / 1000);
    const totalHits = await client.incr(redisKey);
    if (totalHits === 1) {
      await client.expire(redisKey, ttlSeconds);
    }
    const pttl = await client.pttl(redisKey);
    const timeToExpire = pttl > 0 ? pttl : ttl;
    const isBlocked = totalHits > limit;
    let timeToBlockExpire = 0;
    if (isBlocked && blockDuration > 0) {
      const blockKey = CACHE_KEYS.THROTTLE_BLOCK(key);
      const blockSeconds = Math.ceil(blockDuration / 1000);
      const wasSet = await client.set(blockKey, '1', 'EX', blockSeconds, 'NX');
      if (!wasSet) {
        const blockPttl = await client.pttl(blockKey);
        timeToBlockExpire = blockPttl > 0 ? blockPttl : 0;
      } else {
        timeToBlockExpire = blockDuration;
      }
    }
    return { totalHits, timeToExpire, isBlocked, timeToBlockExpire };
  }
}
