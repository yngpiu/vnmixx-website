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

/**
 * Hàm khởi tạo và cấu hình ứng dụng (Bootstrap).
 * Thực hiện các bước: Tạo Instance NestJS,
 * cấu hình Versioning, Bảo mật (Helmet), CORS, Validation, và Swagger.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // Sử dụng Logger pino thay cho logger mặc định của NestJS
  app.useLogger(app.get(Logger));

  // Cấu hình Versioning cho API (mặc định là v1)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const port = Number(process.env.PORT) || 4000;

  // Thiết lập các header bảo mật bằng Helmet
  app.use(helmet({ contentSecurityPolicy: false }));
  // Sử dụng cookie-parser để xử lý cookies từ request
  app.use(cookieParser());

  // Cấu hình CORS dựa trên biến môi trường hoặc danh sách mặc định khi dev
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

  // Cấu hình Global Validation Pipe để tự động kiểm tra kiểu dữ liệu đầu vào (DTO)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ các field không có trong DTO
      forbidNonWhitelisted: true, // Trả về lỗi nếu có field lạ
      transform: true, // Tự động convert kiểu dữ liệu (vd: string -> number)
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: true, // Dừng lại ở lỗi đầu tiên
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          return error.constraints ? Object.values(error.constraints)[0] : 'Dữ liệu không hợp lệ';
        });
        return new BadRequestException(messages);
      },
    }),
  );

  // Cấu hình tài liệu API bằng Swagger
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

  // Lắng nghe trên port đã cấu hình
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
