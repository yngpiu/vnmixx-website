import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { HealthController } from './health/health.controller';
import { PrismaHealthIndicator } from './health/prisma-health.indicator';
import { RedisHealthIndicator } from './health/redis-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    PrismaHealthIndicator,
    RedisHealthIndicator,
  ],
})
export class CoreModule {}
