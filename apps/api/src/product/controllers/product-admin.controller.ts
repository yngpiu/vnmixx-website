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
  ok,
  okNoData,
  type SuccessPayload,
} from '../../common/utils/response.util';
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

@ApiTags('Sản phẩm (Quản trị)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(ProductAdminListResponseDto, ProductAdminDetailResponseDto)
@Controller('admin/products')
// Quản trị toàn diện vòng đời sản phẩm, bao gồm biến thể và hình ảnh.
export class ProductAdminController {
  constructor(private readonly productService: ProductService) {}

  // ─── Product CRUD ──────────────────────────────────────────────────────────

  // Lấy danh sách sản phẩm với các bộ lọc nâng cao phục vụ quản lý kho.
  @ApiOperation({
    summary: 'Lấy danh sách sản phẩm',
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
  ): Promise<SuccessPayload<ProductAdminListResponseDto>> {
    return ok(await this.productService.findAdminList(query), 'Lấy danh sách sản phẩm thành công.');
  }

  // Lấy đầy đủ thông tin chi tiết của một sản phẩm để quản trị.
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm' })
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

  // Tạo một sản phẩm mới cùng với các biến thể và hình ảnh ban đầu.
  @ApiOperation({ summary: 'Tạo sản phẩm mới' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductAdminDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu yêu cầu không hợp lệ.' })
  @ApiConflictResponse({ description: 'Slug hoặc SKU sản phẩm đã tồn tại.' })
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

  // Cập nhật các thông tin cơ bản của một sản phẩm hiện có.
  @ApiOperation({ summary: 'Cập nhật thông tin sản phẩm' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductAdminDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'Slug sản phẩm đã bị trùng.' })
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

  // Thực hiện xóa mềm sản phẩm để tạm ngừng kinh doanh nhưng vẫn giữ lịch sử.
  @ApiOperation({ summary: 'Xóa mềm sản phẩm' })
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

  // Khôi phục lại sản phẩm đã bị xóa mềm trước đó.
  @ApiOperation({ summary: 'Khôi phục sản phẩm' })
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

  // Thêm một biến thể mới (kích thước/màu sắc) cho sản phẩm.
  @ApiOperation({ summary: 'Thêm biến thể mới' })
  @ApiCreatedResponse({
    description: 'Tạo biến thể thành công.',
    schema: buildNullDataSuccessResponseSchema('Tạo biến thể thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'SKU hoặc tổ hợp biến thể đã tồn tại.' })
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

  // Cập nhật giá bán hoặc số lượng tồn kho của một biến thể.
  @ApiOperation({ summary: 'Cập nhật biến thể' })
  @ApiOkResponse({
    description: 'Cập nhật biến thể thành công.',
    schema: buildNullDataSuccessResponseSchema('Cập nhật biến thể thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy biến thể.' })
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

  // Xóa mềm một biến thể của sản phẩm.
  @ApiOperation({ summary: 'Xóa mềm biến thể' })
  @ApiOkResponse({
    description: 'Xóa biến thể thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa biến thể thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy biến thể.' })
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

  // Thêm hình ảnh minh họa mới cho sản phẩm.
  @ApiOperation({ summary: 'Thêm hình ảnh mới' })
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

  // Cập nhật thông tin mô tả hoặc thứ tự hiển thị của hình ảnh.
  @ApiOperation({ summary: 'Cập nhật hình ảnh' })
  @ApiOkResponse({
    description: 'Cập nhật hình ảnh sản phẩm thành công.',
    schema: buildNullDataSuccessResponseSchema('Cập nhật hình ảnh sản phẩm thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy hình ảnh.' })
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

  // Xóa vĩnh viễn một hình ảnh khỏi sản phẩm.
  @ApiOperation({ summary: 'Xóa hình ảnh' })
  @ApiOkResponse({
    description: 'Xóa hình ảnh sản phẩm thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa hình ảnh sản phẩm thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy hình ảnh.' })
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
