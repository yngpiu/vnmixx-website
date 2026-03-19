import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 4000;

  await app.listen(port, '0.0.0.0');
  const url = await app.getUrl();
  logger.log(`API is running on ${url} (port: ${port})`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
