import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                  },
                },
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
