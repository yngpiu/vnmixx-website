import { Global, Module, Provider } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';

const providers: Provider[] = [
  makeHistogramProvider({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  }),
  makeCounterProvider({
    name: 'order_placed_total',
    help: 'Total number of orders placed',
  }),
  makeCounterProvider({
    name: 'auth_login_total',
    help: 'Total number of login attempts',
    labelNames: ['user_type', 'result'],
  }),
  makeCounterProvider({
    name: 'redis_cache_hit_total',
    help: 'Total number of redis cache hits',
  }),
  makeCounterProvider({
    name: 'redis_cache_miss_total',
    help: 'Total number of redis cache misses',
  }),
];

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [...providers],
  exports: [PrometheusModule, ...providers],
})
export class MetricsModule {}
