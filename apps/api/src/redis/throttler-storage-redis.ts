import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { CACHE_KEYS } from './cache-keys';
import { RedisService } from './redis.service';

/**
 * Triển khai bộ lưu trữ (Storage) cho ThrottlerModule sử dụng Redis.
 * Cho phép quản lý giới hạn tần suất yêu cầu (Rate Limiting) tập trung,
 * hỗ trợ tốt cho môi trường chạy nhiều instance API.
 */
@Injectable()
export class ThrottlerStorageRedis implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  /**
   * Tăng số lượng hit và kiểm tra giới hạn.
   * Sử dụng lệnh INCR và EXPIRE của Redis để quản lý TTL.
   * Nếu vượt quá giới hạn, sẽ thiết lập khóa chặn (block) nếu blockDuration > 0.
   */
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

    // Tăng số lượt truy cập
    const totalHits = await client.incr(redisKey);
    if (totalHits === 1) {
      await client.expire(redisKey, ttlSeconds);
    }

    const pttl = await client.pttl(redisKey);
    const timeToExpire = pttl > 0 ? pttl : ttl;
    const isBlocked = totalHits > limit;
    let timeToBlockExpire = 0;

    // Xử lý logic chặn (block) nếu cần
    if (isBlocked && blockDuration > 0) {
      const blockKey = CACHE_KEYS.THROTTLE_BLOCK(key);
      const blockSeconds = Math.ceil(blockDuration / 1000);

      // Sử dụng NX để chỉ set nếu chưa tồn tại khóa chặn
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
