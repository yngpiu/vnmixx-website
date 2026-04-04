import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { CategoryTreeNodeDto } from '../dto';
import { CategoryService } from '../services/category.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Get category tree (public, active only, max 3 levels)' })
  @ApiOkResponse({ type: [CategoryTreeNodeDto], description: 'Nested category tree' })
  @Public()
  @Get()
  async getTree(): Promise<CategoryTreeNodeDto[]> {
    return this.categoryService.findActiveTree();
  }
}
