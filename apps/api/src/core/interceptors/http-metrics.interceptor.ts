import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Request, Response } from 'express';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const method = request.method;
    const url = request.url;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startedAt) / 1000;
        const statusCode = response.statusCode;

        this.histogram.observe(
          { method, route: url, status_code: statusCode.toString() },
          duration,
        );
      }),
    );
  }
}
