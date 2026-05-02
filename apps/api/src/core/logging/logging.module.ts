import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';

const TOO_MANY_REQUESTS_STATUS_CODE = 429;

// Cấu hình logger toàn cục (Pino) với request id và chế độ pretty theo môi trường.
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        const enablePretty =
          config.get<string>('LOG_PRETTY') === 'true' ||
          (!isProduction && config.get<string>('LOG_PRETTY') !== 'false');
        return {
          pinoHttp: {
            transport: enablePretty
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: false,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname,req.headers,res.headers',
                    messageFormat:
                      '{msg} {req.method} {req.url} {res.statusCode} ({responseTime}ms)',
                  },
                }
              : undefined,
            autoLogging: true,
            customLogLevel: (_req: unknown, res: { statusCode?: number }, err: unknown) => {
              if (res.statusCode === TOO_MANY_REQUESTS_STATUS_CODE) {
                return 'warn';
              }
              if (err || (typeof res.statusCode === 'number' && res.statusCode >= 500)) {
                return 'error';
              }
              return 'info';
            },
            customErrorMessage: (
              req: unknown,
              res: { statusCode?: number },
              err: { message?: string } | null,
            ) => {
              const request = req as Request;
              if (res.statusCode === TOO_MANY_REQUESTS_STATUS_CODE) {
                return `Yêu cầu bị giới hạn: ${request.method} ${request.url} (${TOO_MANY_REQUESTS_STATUS_CODE})`;
              }
              return err?.message ?? 'Yêu cầu thất bại';
            },
            customErrorObject: (
              req: unknown,
              res: { statusCode?: number },
              err: { message?: string; name?: string; stack?: string } | null,
            ) => {
              const request = req as Request & { id?: string };
              if (res.statusCode === TOO_MANY_REQUESTS_STATUS_CODE) {
                return {
                  code: 'TOO_MANY_REQUESTS',
                  statusCode: TOO_MANY_REQUESTS_STATUS_CODE,
                  message: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau.',
                  method: request.method,
                  path: request.url,
                  requestId: request.id,
                };
              }
              return {
                name: err?.name ?? 'RequestError',
                message: err?.message ?? 'Yêu cầu thất bại',
                stack: err?.stack,
              };
            },
            genReqId: (req: unknown) => {
              const r = req as Request;
              return (r.headers['x-request-id'] as string) || randomUUID();
            },
            quietReqLogger: true,
            serializers: {
              req: (req: unknown) => {
                const r = req as Request & { id: string };
                return {
                  id: r.id,
                  method: r.method,
                  url: r.url,
                };
              },
            },
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
