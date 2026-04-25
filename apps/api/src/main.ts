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

// Khởi tạo và cấu hình toàn bộ ứng dụng API.
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // Sử dụng logger pino cho toàn ứng dụng.
  app.useLogger(app.get(Logger));

  // Bật versioning theo URI với phiên bản mặc định v1.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const port = Number(process.env.PORT) || 4000;

  // Bật các header bảo mật cơ bản qua Helmet.
  app.use(helmet({ contentSecurityPolicy: false }));
  // Bật parser để đọc cookie từ request.
  app.use(cookieParser());

  // Cấu hình CORS từ biến môi trường hoặc danh sách dev mặc định.
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

  // Áp dụng validation pipe toàn cục cho dữ liệu đầu vào.
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

  // Cấu hình tài liệu API qua Swagger.
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

  // Khởi động server và ghi log địa chỉ truy cập.
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
