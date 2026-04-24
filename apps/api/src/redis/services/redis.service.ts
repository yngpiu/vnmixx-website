import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
// Đóng gói kết nối Redis và các thao tác cache dùng chung cho toàn hệ thống.
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  // Khởi tạo Redis client từ URL hoặc cấu hình host/port riêng.
  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    const options = this.buildOptions();

    this.client = redisUrl ? new Redis(redisUrl, options) : new Redis(options);

    this.client.on('error', (error) => {
      this.logger.error(`Lỗi kết nối Redis: ${error.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Đã kết nối thành công tới Redis');
    });
  }

  // Kết nối Redis khi module khởi tạo (lazy connect).
  async onModuleInit(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  // Ngắt kết nối Redis an toàn khi ứng dụng dừng.
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

  // Trả về Redis client gốc cho các lệnh nâng cao.
  getClient(): Redis {
    return this.client;
  }

  // Áp dụng cache-aside: đọc cache trước, miss thì gọi factory rồi ghi lại.
  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.client.get(key);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch (error) {
        this.logger.warn(
          `Lỗi giải mã cache Redis cho khóa "${key}": ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.client.del(key);
      }
    }

    const data = await factory();

    await this.client.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  }

  // Xóa một hoặc nhiều cache key.
  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.del(...keys);
  }

  // Xóa cache theo pattern bằng SCAN để tránh block Redis server.
  async deleteByPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({ match: pattern, count: 100 });

    for await (const keys of stream) {
      if ((keys as string[]).length > 0) {
        await this.client.del(...(keys as string[]));
      }
    }
  }

  // Build Redis options từ biến môi trường cấu hình.
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
