import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redis: RedisService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string = 'redis'): Promise<HealthIndicatorResult> {
    try {
      const result = await this.redis.getClient().ping();
      if (result === 'PONG') {
        return this.healthIndicatorService.check(key).up();
      } else {
        return this.healthIndicatorService.check(key).down('Redis ping failed');
      }
    } catch {
      return this.healthIndicatorService.check(key).down();
    }
  }
}
