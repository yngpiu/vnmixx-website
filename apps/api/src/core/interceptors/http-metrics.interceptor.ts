import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Request, Response } from 'express';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor dùng để thu thập các chỉ số (metrics) của HTTP request.
 * Ghi lại thời gian phản hồi và lưu trữ dưới dạng Histogram để Prometheus có thể scrape.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly histogram: Histogram<string>,
  ) {}

  /**
   * Tính toán thời gian thực thi của request và gửi metric về Prometheus.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const method = request.method;
    const url = request.url;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Tính toán độ trễ (latency) của request
        const duration = (Date.now() - startedAt) / 1000;
        const statusCode = response.statusCode;

        // Lưu metric với các nhãn: phương thức, đường dẫn và mã trạng thái
        this.histogram.observe(
          { method, route: url, status_code: statusCode.toString() },
          duration,
        );
      }),
    );
  }
}
