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
  ApiBadRequestResponse,
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
  CreateImageDto,
  CreateProductDto,
  CreateVariantDto,
  ListAdminProductsQueryDto,
  ProductAdminDetailResponseDto,
  ProductAdminListResponseDto,
  UpdateImageDto,
  UpdateProductDto,
  UpdateVariantDto,
} from '../dto';
import { ProductService } from '../services/product.service';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/products')
export class ProductAdminController {
  constructor(private readonly productService: ProductService) {}

  // ─── Product CRUD ──────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Liệt kê sản phẩm (quản trị)',
    description:
      '`isActive` / `isSoftDeleted`: không gửi = không lọc; gửi true/false để lọc tương ứng.',
  })
  @ApiOkResponse({ type: ProductAdminListResponseDto })
  @Get()
  findAll(@Query() query: ListAdminProductsQueryDto) {
    return this.productService.findAdminList(query);
  }

  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm (quản trị)' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findAdminById(id);
  }

  @ApiOperation({ summary: 'Tạo sản phẩm kèm biến thể, hình ảnh và thuộc tính' })
  @ApiCreatedResponse({ type: ProductAdminDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Xác thực dữ liệu yêu cầu thất bại.' })
  @ApiConflictResponse({ description: 'Slug hoặc SKU sản phẩm đã được sử dụng.' })
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin cơ bản sản phẩm' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'Slug sản phẩm đã được sử dụng.' })
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa mềm sản phẩm và các biến thể' })
  @ApiNoContentResponse({ description: 'Xóa sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productService.softDelete(id);
  }

  @ApiOperation({ summary: 'Khôi phục sản phẩm đã xóa mềm' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.productService.restore(id);
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Thêm biến thể cho sản phẩm' })
  @ApiCreatedResponse({ description: 'Tạo biến thể thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'SKU biến thể hoặc tổ hợp màu-kích thước đã được sử dụng.' })
  @Post(':id/variants')
  createVariant(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVariantDto) {
    return this.productService.createVariant(id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật biến thể (giá, tồn kho, trạng thái)' })
  @ApiOkResponse({ description: 'Cập nhật biến thể thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc biến thể.' })
  @Put(':id/variants/:variantId')
  updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productService.updateVariant(id, variantId, dto);
  }

  @ApiOperation({ summary: 'Xóa mềm biến thể' })
  @ApiNoContentResponse({ description: 'Xóa biến thể thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc biến thể.' })
  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
  ): Promise<void> {
    return this.productService.softDeleteVariant(id, variantId);
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Thêm hình ảnh cho sản phẩm' })
  @ApiCreatedResponse({ description: 'Thêm hình ảnh sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Post(':id/images')
  createImage(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateImageDto) {
    return this.productService.createImage(id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật hình ảnh' })
  @ApiOkResponse({ description: 'Cập nhật hình ảnh sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc hình ảnh.' })
  @Put(':id/images/:imageId')
  updateImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() dto: UpdateImageDto,
  ) {
    return this.productService.updateImage(id, imageId, dto);
  }

  @ApiOperation({ summary: 'Xóa hình ảnh' })
  @ApiNoContentResponse({ description: 'Xóa hình ảnh sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc hình ảnh.' })
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<void> {
    return this.productService.deleteImage(id, imageId);
  }
}
