import { Global, Module } from '@nestjs/common';
import { RedisService } from './services/redis.service';

// Cung cấp RedisService dùng chung toàn ứng dụng qua phạm vi Global module.
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
