import { BadRequestException, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

import { otelSDK } from './core/tracing/tracing';

async function bootstrap() {
  // Start OpenTelemetry SDK
  otelSDK.start();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const port = Number(process.env.PORT) || 4000;

  app.use(helmet({ contentSecurityPolicy: false }));
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
  const appLogger = app.get(Logger);
  appLogger.log(`API is running on ${url} (port: ${port})`);
  appLogger.log(`Swagger UI available at ${url}/docs`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
