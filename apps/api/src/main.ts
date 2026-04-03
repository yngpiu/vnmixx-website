import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 4000;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Vnmixx API')
    .setDescription(
      'REST API for the Vnmixx platform. ' +
        'Supports dual-role authentication (Customer & Employee) with JWT Bearer tokens.',
    )
    .setVersion('1.0')
    .setContact('Vnmixx Team', 'https://vnmixx.vn', 'dev@vnmixx.vn')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
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
    customSiteTitle: 'Vnmixx API Docs',
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
