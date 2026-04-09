import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    const options = this.buildOptions();
    this.client = redisUrl ? new Redis(redisUrl, options) : new Redis(options);

    this.client.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  async onModuleInit(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

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

  getClient(): Redis {
    return this.client;
  }

  // ─── Cache helpers ──────────────────────────────────────────────────────────

  /**
   * Cache-aside: return cached value or compute, store, and return.
   */
  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.client.get(key);
    if (cached !== null) return JSON.parse(cached) as T;

    const data = await factory();
    await this.client.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.del(...keys);
  }

  /**
   * Delete all keys matching a glob pattern using SCAN (non-blocking).
   */
  async deleteByPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream) {
      if ((keys as string[]).length > 0) {
        await this.client.del(...(keys as string[]));
      }
    }
  }

  private buildOptions(): RedisOptions {
    return {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      username: process.env.REDIS_USERNAME || undefined,
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB) || 0,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    };
  }
}
