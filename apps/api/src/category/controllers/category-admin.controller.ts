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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
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
@ApiUnauthorizedResponse({ description: 'Authentication is required or token is invalid.' })
@ApiForbiddenResponse({ description: 'You do not have permission to access this resource.' })
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

  @ApiOperation({ summary: 'Create a new category' })
  @ApiCreatedResponse({ type: CategoryAdminResponseDto })
  @ApiConflictResponse({ description: 'Category slug is already in use.' })
  @Post()
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryAdminResponseDto> {
    return this.categoryService.create(dto);
  }

  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ type: CategoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  @ApiConflictResponse({ description: 'Category slug is already in use.' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryAdminResponseDto> {
    return this.categoryService.update(id, dto);
  }

  @ApiOperation({ summary: 'Soft-delete a category' })
  @ApiNoContentResponse({ description: 'Category deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  @ApiConflictResponse({
    description: 'Category cannot be deleted because it has active children.',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categoryService.softDelete(id);
  }

  @ApiOperation({ summary: 'Restore a soft-deleted category' })
  @ApiOkResponse({ type: CategoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  @Patch(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number): Promise<CategoryAdminResponseDto> {
    return this.categoryService.restore(id);
  }
}
