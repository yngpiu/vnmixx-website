import { Module } from '@nestjs/common';
import { CategoryAdminController } from './controllers/category-admin.controller';
import { CategoryController } from './controllers/category.controller';
import { CategoryRepository } from './repositories/category.repository';
import { CategoryService } from './services/category.service';

@Module({
  controllers: [CategoryController, CategoryAdminController],
  providers: [CategoryService, CategoryRepository],
})
export class CategoryModule {}
