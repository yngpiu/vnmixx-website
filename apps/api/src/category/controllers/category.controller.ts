import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { CategoryDetailDto, CategoryResponseDto } from '../dto';
import { CategoryService } from '../services/category.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả danh mục đang hoạt động (dạng phẳng)' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  @Public()
  @Get()
  findAll(): Promise<CategoryResponseDto[]> {
    return this.categoryService.findActiveFlat();
  }

  @ApiOperation({ summary: 'Lấy chi tiết danh mục theo slug, bao gồm danh mục con trực tiếp' })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string): Promise<CategoryDetailDto> {
    return this.categoryService.findBySlug(slug);
  }
}
