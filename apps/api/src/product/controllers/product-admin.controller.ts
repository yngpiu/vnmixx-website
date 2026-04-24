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
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { buildAuditRequestContext } from '../../audit-log/audit-log-request.util';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/response-schema.util';
import { ok, okNoData, type SuccessPayload } from '../../common/utils/response.util';
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
@ApiExtraModels(ProductAdminListResponseDto, ProductAdminDetailResponseDto)
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
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductAdminListResponseDto) }),
  })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(
    @Query() query: ListAdminProductsQueryDto,
  ): Promise<SuccessPayload<Awaited<ReturnType<ProductService['findAdminList']>>>> {
    return ok(await this.productService.findAdminList(query), 'Lấy danh sách sản phẩm thành công.');
  }

  // Lấy đầy đủ thông tin sản phẩm để thực hiện chỉnh sửa hoặc kiểm tra chi tiết.
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm (quản trị)' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductAdminDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<ProductAdminDetailResponseDto>> {
    return ok(await this.productService.findAdminById(id), 'Lấy chi tiết sản phẩm thành công.');
  }

  // Khởi tạo sản phẩm mới cùng các thông tin đi kèm để bắt đầu kinh doanh mặt hàng đó.
  @ApiOperation({ summary: 'Tạo sản phẩm kèm biến thể, hình ảnh và thuộc tính' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductAdminDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Xác thực dữ liệu yêu cầu thất bại.' })
  @ApiConflictResponse({ description: 'Slug hoặc SKU sản phẩm đã được sử dụng.' })
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<ProductAdminDetailResponseDto>> {
    return ok(
      await this.productService.create(dto, buildAuditRequestContext(request, user)),
      'Tạo sản phẩm thành công.',
    );
  }

  // Cập nhật các thông tin cơ bản của sản phẩm khi có thay đổi từ phía nhà cung cấp hoặc marketing.
  @ApiOperation({ summary: 'Cập nhật thông tin cơ bản sản phẩm' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductAdminDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'Slug sản phẩm đã được sử dụng.' })
  @Put(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<ProductAdminDetailResponseDto>> {
    return ok(
      await this.productService.update(id, dto, buildAuditRequestContext(request, user)),
      'Cập nhật sản phẩm thành công.',
    );
  }

  // Tạm dừng kinh doanh sản phẩm bằng cách xóa mềm để giữ lại dữ liệu lịch sử.
  @ApiOperation({ summary: 'Xóa mềm sản phẩm và các biến thể' })
  @ApiOkResponse({
    description: 'Xóa sản phẩm thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa sản phẩm thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.productService.softDelete(id, buildAuditRequestContext(request, user));
    return okNoData('Xóa sản phẩm thành công.');
  }

  // Khôi phục lại sản phẩm đã xóa mềm khi muốn kinh doanh trở lại.
  @ApiOperation({ summary: 'Khôi phục sản phẩm đã xóa mềm' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductAdminDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Patch(':id/restore')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<ProductAdminDetailResponseDto>> {
    return ok(
      await this.productService.restore(id, buildAuditRequestContext(request, user)),
      'Khôi phục sản phẩm thành công.',
    );
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  // Thêm các lựa chọn mới (màu, size) cho sản phẩm hiện có.
  @ApiOperation({ summary: 'Thêm biến thể cho sản phẩm' })
  @ApiCreatedResponse({
    description: 'Tạo biến thể thành công.',
    schema: buildNullDataSuccessResponseSchema('Tạo biến thể thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'SKU biến thể hoặc tổ hợp màu-kích thước đã được sử dụng.' })
  @Post(':id/variants')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async createVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.productService.createVariant(id, dto, buildAuditRequestContext(request, user));
    return okNoData('Tạo biến thể thành công.');
  }

  // Quản lý tồn kho và giá bán chi tiết cho từng biến thể cụ thể.
  @ApiOperation({ summary: 'Cập nhật biến thể (giá, tồn kho, trạng thái)' })
  @ApiOkResponse({
    description: 'Cập nhật biến thể thành công.',
    schema: buildNullDataSuccessResponseSchema('Cập nhật biến thể thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc biến thể.' })
  @Put(':id/variants/:variantId')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.productService.updateVariant(
      id,
      variantId,
      dto,
      buildAuditRequestContext(request, user),
    );
    return okNoData('Cập nhật biến thể thành công.');
  }

  // Loại bỏ một biến thể không còn được sản xuất hoặc kinh doanh.
  @ApiOperation({ summary: 'Xóa mềm biến thể' })
  @ApiOkResponse({
    description: 'Xóa biến thể thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa biến thể thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc biến thể.' })
  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async removeVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.productService.softDeleteVariant(
      id,
      variantId,
      buildAuditRequestContext(request, user),
    );
    return okNoData('Xóa biến thể thành công.');
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  // Cập nhật hình ảnh minh họa mới cho sản phẩm.
  @ApiOperation({ summary: 'Thêm hình ảnh cho sản phẩm' })
  @ApiCreatedResponse({
    description: 'Thêm hình ảnh sản phẩm thành công.',
    schema: buildNullDataSuccessResponseSchema('Thêm hình ảnh sản phẩm thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Post(':id/images')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async createImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateImageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.productService.createImage(id, dto, buildAuditRequestContext(request, user));
    return okNoData('Thêm hình ảnh sản phẩm thành công.');
  }

  // Thay đổi thông tin ảnh hoặc thứ tự hiển thị để tối ưu hóa trải nghiệm khách hàng.
  @ApiOperation({ summary: 'Cập nhật hình ảnh' })
  @ApiOkResponse({
    description: 'Cập nhật hình ảnh sản phẩm thành công.',
    schema: buildNullDataSuccessResponseSchema('Cập nhật hình ảnh sản phẩm thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc hình ảnh.' })
  @Put(':id/images/:imageId')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async updateImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() dto: UpdateImageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.productService.updateImage(
      id,
      imageId,
      dto,
      buildAuditRequestContext(request, user),
    );
    return okNoData('Cập nhật hình ảnh sản phẩm thành công.');
  }

  // Loại bỏ hình ảnh cũ hoặc không còn phù hợp.
  @ApiOperation({ summary: 'Xóa hình ảnh' })
  @ApiOkResponse({
    description: 'Xóa hình ảnh sản phẩm thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa hình ảnh sản phẩm thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm hoặc hình ảnh.' })
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.productService.deleteImage(id, imageId, buildAuditRequestContext(request, user));
    return okNoData('Xóa hình ảnh sản phẩm thành công.');
  }
}
