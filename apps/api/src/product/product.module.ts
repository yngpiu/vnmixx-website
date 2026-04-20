import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ProductAdminController } from './controllers/product-admin.controller';
import { ProductController } from './controllers/product.controller';
import { ProductRepository } from './repositories/product.repository';
import { ProductCacheService } from './services/product-cache.service';
import { ProductImageService } from './services/product-image.service';
import { ProductVariantService } from './services/product-variant.service';
import { ProductService } from './services/product.service';

@Module({
  imports: [AuditLogModule],
  controllers: [ProductController, ProductAdminController],
  providers: [
    ProductService,
    ProductRepository,
    ProductCacheService,
    ProductVariantService,
    ProductImageService,
  ],
})
export class ProductModule {}
