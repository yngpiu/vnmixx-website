import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireUserType } from '../../auth/decorators';
import {
  CategoryAdminResponseDto,
  CreateCategoryDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from '../dto';
import { CategoryService } from '../services/category.service';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@RequireUserType('EMPLOYEE')
@Controller('admin/categories')
export class CategoryAdminController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({
    summary: 'List categories',
    description:
      'Returns active categories by default. Pass `includeDeleted=true` to include soft-deleted entries.',
  })
  @ApiOkResponse({ type: [CategoryAdminResponseDto] })
  @Get()
  async findAll(@Query() query: ListCategoriesQueryDto): Promise<CategoryAdminResponseDto[]> {
    return this.categoryService.findAll(query.includeDeleted);
  }

  @ApiOperation({ summary: 'Get category by ID' })
  @ApiOkResponse({ type: CategoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CategoryAdminResponseDto> {
    return this.categoryService.findById(id);
  }

  @ApiOperation({ summary: 'Create a new category' })
  @ApiCreatedResponse({ type: CategoryAdminResponseDto })
  @ApiConflictResponse({ description: 'Slug already taken' })
  @Post()
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryAdminResponseDto> {
    return this.categoryService.create(dto);
  }

  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ type: CategoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiConflictResponse({ description: 'Slug already taken' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryAdminResponseDto> {
    return this.categoryService.update(id, dto);
  }

  @ApiOperation({ summary: 'Soft-delete a category' })
  @ApiOkResponse({ description: 'Category deleted' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiConflictResponse({ description: 'Category has active children' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categoryService.softDelete(id);
  }

  @ApiOperation({ summary: 'Restore a soft-deleted category' })
  @ApiOkResponse({ type: CategoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @Patch(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number): Promise<CategoryAdminResponseDto> {
    return this.categoryService.restore(id);
  }
}
