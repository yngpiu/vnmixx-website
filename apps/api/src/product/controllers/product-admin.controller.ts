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
  ApiInternalServerErrorResponse,
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
// Quản trị sản phẩm cho nhân viên và admin.
// Quản lý toàn diện vòng đời sản phẩm, bao gồm biến thể (kho hàng) và hình ảnh.
export class ProductAdminController {
  constructor(private readonly productService: ProductService) {}

  // ─── Product CRUD ──────────────────────────────────────────────────────────

  // Liệt kê sản phẩm với các bộ lọc nâng cao phục vụ công tác quản lý kho và kinh doanh.
  @ApiOperation({
    summary: 'Liệt kê sản phẩm (quản trị)',
    description:
      '`isActive` / `isSoftDeleted`: không gửi = không lọc; gửi true/false để lọc tương ứng.',
  })
  @ApiOkResponse({ type: ProductAdminListResponseDto })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findAll(@Query() query: ListAdminProductsQueryDto) {
    return this.productService.findAdminList(query);
  }

  // Lấy đầy đủ thông tin sản phẩm để thực hiện chỉnh sửa hoặc kiểm tra chi tiết.
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm (quản trị)' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findAdminById(id);
  }

  // Khởi tạo sản phẩm mới cùng các thông tin đi kèm để bắt đầu kinh doanh mặt hàng đó.
  @ApiOperation({ summary: 'Tạo sản phẩm kèm biến thể, hình ảnh và thuộc tính' })
  @ApiCreatedResponse({ type: ProductAdminDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Xác thực dữ liệu yêu cầu thất bại.' })
  @ApiConflictResponse({ description: 'Slug hoặc SKU sản phẩm đã được sử dụng.' })
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.create(dto, buildAuditRequestContext(request, user));
  }

  // Cập nhật các thông tin cơ bản của sản phẩm khi có thay đổi từ phía nhà cung cấp hoặc marketing.
  @ApiOperation({ summary: 'Cập nhật thông tin cơ bản sản phẩm' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'Slug sản phẩm đã được sử dụng.' })
  @Put(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.update(id, dto, buildAuditRequestContext(request, user));
  }

  // Tạm dừng kinh doanh sản phẩm bằng cách xóa mềm để giữ lại dữ liệu lịch sử.
  @ApiOperation({ summary: 'Xóa mềm sản phẩm và các biến thể' })
  @ApiNoContentResponse({ description: 'Xóa sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.productService.softDelete(id, buildAuditRequestContext(request, user));
  }

  // Khôi phục lại sản phẩm đã xóa mềm khi muốn kinh doanh trở lại.
  @ApiOperation({ summary: 'Khôi phục sản phẩm đã xóa mềm' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Patch(':id/restore')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.restore(id, buildAuditRequestContext(request, user));
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  // Thêm các lựa chọn mới (màu, size) cho sản phẩm hiện có.
  @ApiOperation({ summary: 'Thêm biến thể cho sản phẩm' })
  @ApiCreatedResponse({ description: 'Tạo biến thể thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'SKU biến thể hoặc tổ hợp màu-kích thước đã được sử dụng.' })
  @Post(':id/variants')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  createVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.createVariant(id, dto, buildAuditRequestContext(request, user));
  }

  // Quản lý tồn kho và giá bán chi tiết cho từng biến thể cụ thể.
  @ApiOperation({ summary: 'Cập nhật biến thể (giá, tồn kho, trạng thái)' })
  @ApiOkResponse({ description: 'Cập nhật biến thể thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc biến thể.' })
  @Put(':id/variants/:variantId')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
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

  // Loại bỏ một biến thể không còn được sản xuất hoặc kinh doanh.
  @ApiOperation({ summary: 'Xóa mềm biến thể' })
  @ApiNoContentResponse({ description: 'Xóa biến thể thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc biến thể.' })
  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
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

  // Cập nhật hình ảnh minh họa mới cho sản phẩm.
  @ApiOperation({ summary: 'Thêm hình ảnh cho sản phẩm' })
  @ApiCreatedResponse({ description: 'Thêm hình ảnh sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Post(':id/images')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  createImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateImageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.productService.createImage(id, dto, buildAuditRequestContext(request, user));
  }

  // Thay đổi thông tin ảnh hoặc thứ tự hiển thị để tối ưu hóa trải nghiệm khách hàng.
  @ApiOperation({ summary: 'Cập nhật hình ảnh' })
  @ApiOkResponse({ description: 'Cập nhật hình ảnh sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc hình ảnh.' })
  @Put(':id/images/:imageId')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
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

  // Loại bỏ hình ảnh cũ hoặc không còn phù hợp.
  @ApiOperation({ summary: 'Xóa hình ảnh' })
  @ApiNoContentResponse({ description: 'Xóa hình ảnh sản phẩm thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc hình ảnh.' })
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.productService.deleteImage(id, imageId, buildAuditRequestContext(request, user));
  }
}
