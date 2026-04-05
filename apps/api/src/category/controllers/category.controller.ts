import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { CategoryDetailDto, CategoryResponseDto } from '../dto';
import { CategoryService } from '../services/category.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'List all active categories (flat)' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  @Public()
  @Get()
  findAll(): Promise<CategoryResponseDto[]> {
    return this.categoryService.findActiveFlat();
  }

  @ApiOperation({ summary: 'Get category detail by slug, includes direct sub-categories' })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string): Promise<CategoryDetailDto> {
    return this.categoryService.findBySlug(slug);
  }
}
