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
  Req,
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
import type { Request } from 'express';
import { buildAuditRequestContext } from '../../audit-log/audit-log-request.util';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
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
/**
 * ProductAdminController: Quản trị sản phẩm cho nhân viên và admin.
 * Cung cấp các endpoint để quản lý toàn diện vòng đời sản phẩm, biến thể và hình ảnh.
 */
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
  /**
   * Liệt kê danh sách sản phẩm với các bộ lọc nâng cao dành cho admin.
   * Hỗ trợ tìm kiếm theo tên, SKU, lọc theo danh mục, trạng thái kích hoạt và trạng thái xóa mềm.
   */
  findAll(@Query() query: ListAdminProductsQueryDto) {
    return this.productService.findAdminList(query);
  }

  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm (quản trị)' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Get(':id')
  /**
   * Lấy thông tin chi tiết một sản phẩm bao gồm tất cả các biến thể, hình ảnh và thuộc tính.
   */
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findAdminById(id);
  }

  @ApiOperation({ summary: 'Tạo sản phẩm kèm biến thể, hình ảnh và thuộc tính' })
  @ApiCreatedResponse({ type: ProductAdminDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Xác thực dữ liệu yêu cầu thất bại.' })
  @ApiConflictResponse({ description: 'Slug hoặc SKU sản phẩm đã được sử dụng.' })
  @Post()
  /**
   * Tạo sản phẩm mới.
   * Logic bao gồm: tạo thông tin cơ bản, các biến thể (SKU, giá, tồn kho),
   * gán hình ảnh và liên kết các danh mục/thuộc tính.
   * Tự động tạo slug từ tên sản phẩm nếu không được cung cấp.
   */
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.create(dto, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Cập nhật thông tin cơ bản sản phẩm' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'Slug sản phẩm đã được sử dụng.' })
  @Put(':id')
  /**
   * Cập nhật thông tin cơ bản của sản phẩm (tên, mô tả, slug, trạng thái).
   * Lưu ý: Không cập nhật trực tiếp biến thể hoặc hình ảnh qua endpoint này (có các endpoint riêng).
   */
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.update(id, dto, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Xóa mềm sản phẩm và các biến thể' })
  @ApiNoContentResponse({ description: 'Xóa sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  /**
   * Xóa mềm sản phẩm.
   * Chuyển trạng thái `isDeleted` thành true, sản phẩm sẽ không hiển thị ở phía Shop
   * nhưng vẫn lưu trong DB để đối soát hoặc khôi phục khi cần.
   */
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.productService.softDelete(id, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Khôi phục sản phẩm đã xóa mềm' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Patch(':id/restore')
  /**
   * Khôi phục sản phẩm đã bị xóa mềm trước đó về trạng thái hoạt động.
   */
  restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.restore(id, buildAuditRequestContext(request, user));
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Thêm biến thể cho sản phẩm' })
  @ApiCreatedResponse({ description: 'Tạo biến thể thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'SKU biến thể hoặc tổ hợp màu-kích thước đã được sử dụng.' })
  @Post(':id/variants')
  /**
   * Thêm một biến thể mới cho sản phẩm hiện có.
   * Kiểm tra tính duy nhất của SKU và tổ hợp Màu/Kích thước trong phạm vi sản phẩm.
   */
  createVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.createVariant(id, dto, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Cập nhật biến thể (giá, tồn kho, trạng thái)' })
  @ApiOkResponse({ description: 'Cập nhật biến thể thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc biến thể.' })
  @Put(':id/variants/:variantId')
  /**
   * Cập nhật thông tin biến thể: giá bán, giá nhập, số lượng tồn kho và trạng thái.
   * Đây là nơi quản lý kho (Inventory) cho từng SKU cụ thể.
   */
  updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.updateVariant(
      id,
      variantId,
      dto,
      buildAuditRequestContext(request, user),
    );
  }

  @ApiOperation({ summary: 'Xóa mềm biến thể' })
  @ApiNoContentResponse({ description: 'Xóa biến thể thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc biến thể.' })
  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  /**
   * Xóa mềm một biến thể cụ thể của sản phẩm.
   */
  removeVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.productService.softDeleteVariant(
      id,
      variantId,
      buildAuditRequestContext(request, user),
    );
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Thêm hình ảnh cho sản phẩm' })
  @ApiCreatedResponse({ description: 'Thêm hình ảnh sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Post(':id/images')
  /**
   * Thêm hình ảnh mới cho sản phẩm, có thể chỉ định là ảnh chính (main image).
   */
  createImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateImageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.createImage(id, dto, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Cập nhật hình ảnh' })
  @ApiOkResponse({ description: 'Cập nhật hình ảnh sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc hình ảnh.' })
  @Put(':id/images/:imageId')
  /**
   * Cập nhật thông tin hình ảnh (URL, thứ tự hiển thị, hoặc đặt làm ảnh chính).
   */
  updateImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() dto: UpdateImageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.updateImage(
      id,
      imageId,
      dto,
      buildAuditRequestContext(request, user),
    );
  }

  @ApiOperation({ summary: 'Xóa hình ảnh' })
  @ApiNoContentResponse({ description: 'Xóa hình ảnh sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc hình ảnh.' })
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  /**
   * Xóa hoàn toàn hình ảnh khỏi cơ sở dữ liệu.
   */
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.productService.deleteImage(id, imageId, buildAuditRequestContext(request, user));
  }
}
