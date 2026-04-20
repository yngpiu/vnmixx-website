import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { CategoryDetailDto, CategoryResponseDto } from '../dto';
import { CategoryService } from '../services/category.service';

@ApiTags('Categories')
@Controller('categories')
/**
 * CategoryController: Cung cấp các endpoint truy vấn danh mục sản phẩm cho phía Shop.
 * Các endpoint này được để ở chế độ công khai (Public).
 */
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả danh mục đang hoạt động (dạng phẳng)' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  @Public()
  @Get()
  /**
   * Trả về danh sách tất cả các danh mục đang hoạt động dưới dạng mảng phẳng.
   */
  findAll(): Promise<CategoryResponseDto[]> {
    return this.categoryService.findActiveFlat();
  }

  @ApiOperation({ summary: 'Lấy chi tiết danh mục theo slug, bao gồm danh mục con trực tiếp' })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @Public()
  @Get(':slug')
  /**
   * Tìm kiếm danh mục theo slug duy nhất.
   * Kết quả trả về bao gồm thông tin chi tiết và danh sách các danh mục con trực thuộc (nếu có).
   */
  findBySlug(@Param('slug') slug: string): Promise<CategoryDetailDto> {
    return this.categoryService.findBySlug(slug);
  }
}
