import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { REDIS_THROTTLER_CACHE_KEYS } from './redis-throttler.cache';
import { RedisService } from './services/redis.service';

@Injectable()
// Lưu dữ liệu rate-limit vào Redis để đồng bộ giữa nhiều instance API.
export class ThrottlerStorageRedis implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  // Tăng bộ đếm request, tính thời gian TTL còn lại và trạng thái bị chặn.
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    const client = this.redis.getClient();
    const redisKey = REDIS_THROTTLER_CACHE_KEYS.THROTTLE(key);
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
      const blockKey = REDIS_THROTTLER_CACHE_KEYS.THROTTLE_BLOCK(key);
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
