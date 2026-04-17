import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app.module';

const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 4000;
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestWithId = req as Request & { requestId?: string };
    requestWithId.requestId = randomUUID();
    res.setHeader('x-request-id', requestWithId.requestId);
    const startedAt = Date.now();
    res.on('finish', () => {
      const durationInMilliseconds = Date.now() - startedAt;
      logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} [${requestWithId.requestId}] - ${durationInMilliseconds}ms`,
      );
    });
    next();
  });

  app.use(cookieParser());

  const corsOriginEnv = process.env.CORS_ORIGIN ?? process.env.CORS_ORIGINS;
  const origin = corsOriginEnv
    ? corsOriginEnv
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : DEFAULT_DEV_CORS_ORIGINS;
  app.enableCors({
    origin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          return error.constraints ? Object.values(error.constraints)[0] : 'Dữ liệu không hợp lệ';
        });
        return new BadRequestException(messages);
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Vnmixx API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Nhập mã JWT để xác thực',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(port, '0.0.0.0');
  const url = await app.getUrl();
  logger.log(`API is running on ${url} (port: ${port})`);
  logger.log(`Swagger UI available at ${url}/docs`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
