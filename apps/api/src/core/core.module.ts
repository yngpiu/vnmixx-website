import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ClsModule } from 'nestjs-cls';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { HealthController } from './health/health.controller';
import { PrismaHealthIndicator } from './health/prisma-health.indicator';
import { RedisHealthIndicator } from './health/redis-health.indicator';
import { HttpMetricsInterceptor } from './interceptors/http-metrics.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggingModule } from './logging/logging.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    TerminusModule,
    LoggingModule,
    MetricsModule,
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
    PrismaHealthIndicator,
    RedisHealthIndicator,
  ],
})
export class CoreModule {}
