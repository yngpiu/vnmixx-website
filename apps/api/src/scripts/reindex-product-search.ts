import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { validateEnv } from '../common/config/env.validation';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductRepository } from '../product/repositories/product.repository';
import { ProductSearchService } from '../product/services/product-search.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    MeilisearchModule,
  ],
  providers: [ProductRepository, ProductSearchService],
})
class ReindexProductSearchModule {}

async function bootstrap(): Promise<void> {
  const logger = new Logger('ReindexProductSearchScript');
  const app = await NestFactory.createApplicationContext(ReindexProductSearchModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const productSearchService = app.get(ProductSearchService);
    await productSearchService.reindexAllProducts();
    logger.log('Product search reindex completed.');
  } finally {
    await app.close();
  }
}

void bootstrap();
