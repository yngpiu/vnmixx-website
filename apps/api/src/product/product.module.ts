import { Module } from '@nestjs/common';
import { ProductAdminController } from './controllers/product-admin.controller';
import { ProductController } from './controllers/product.controller';
import { ProductRepository } from './repositories/product.repository';
import { ProductService } from './services/product.service';

@Module({
  controllers: [ProductController, ProductAdminController],
  providers: [ProductService, ProductRepository],
})
export class ProductModule {}
