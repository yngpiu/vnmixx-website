import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Service quản lý kết nối và cung cấp các tiện ích làm việc với Redis.
 * Hỗ trợ các thao tác cache-aside, xóa theo pattern và quản lý vòng đời kết nối.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    const options = this.buildOptions();
    // Khởi tạo instance Redis client
    this.client = redisUrl ? new Redis(redisUrl, options) : new Redis(options);

    this.client.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  /**
   * Kết nối tới Redis khi module được khởi tạo nếu chưa kết nối.
   */
  async onModuleInit(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  /**
   * Đóng kết nối Redis an toàn khi ứng dụng tắt.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end') {
      return;
    }
    if (this.client.status === 'wait') {
      this.client.disconnect();
      return;
    }
    await this.client.quit();
  }

  /**
   * Trả về instance gốc của ioredis để thực hiện các lệnh nâng cao.
   */
  getClient(): Redis {
    return this.client;
  }

  // ─── Cache helpers ──────────────────────────────────────────────────────────

  /**
   * Pattern Cache-aside: Lấy dữ liệu từ cache, nếu không có thì gọi factory để lấy dữ liệu mới,
   * lưu vào cache và trả về kết quả.
   */
  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.client.get(key);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch (error) {
        this.logger.warn(
          `Redis cache parse failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.client.del(key);
      }
    }

    const data = await factory();
    await this.client.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  }

  /**
   * Xóa một hoặc nhiều khóa khỏi Redis.
   */
  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.del(...keys);
  }

  /**
   * Xóa tất cả các khóa khớp với pattern (glob pattern) sử dụng lệnh SCAN (không gây block server).
   */
  async deleteByPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream) {
      if ((keys as string[]).length > 0) {
        await this.client.del(...(keys as string[]));
      }
    }
  }

  /**
   * Xây dựng tùy chọn kết nối dựa trên cấu hình môi trường.
   */
  private buildOptions(): RedisOptions {
    return {
      host: this.config.get<string>('REDIS_HOST', '127.0.0.1'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      username: this.config.get<string>('REDIS_USERNAME') || undefined,
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      db: this.config.get<number>('REDIS_DB', 0),
      lazyConnect: true,
      maxRetriesPerRequest: null,
    };
  }
}
