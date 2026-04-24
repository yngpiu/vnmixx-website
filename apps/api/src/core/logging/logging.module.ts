import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';

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
