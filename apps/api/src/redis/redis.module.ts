import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Module quản lý kết nối và thao tác với Redis (Cache).
 * Được đánh dấu @Global để có thể sử dụng RedisService ở mọi module khác.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
