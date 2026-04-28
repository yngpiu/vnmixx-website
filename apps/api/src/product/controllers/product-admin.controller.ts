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
  ApiNoContentResponse,
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
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  CreateProductDto,
  ListAdminProductsQueryDto,
  ProductAdminDetailResponseDto,
  ProductAdminListResponseDto,
  UpdateProductDto,
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

  // Cập nhật sản phẩm và thực hiện upsert biến thể/hình ảnh trong cùng một request.
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
  @ApiNoContentResponse({
    description: 'Xóa mềm sản phẩm thành công.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    await this.productService.softDelete(id, buildAuditRequestContext(request, user));
  }

  // Khôi phục lại sản phẩm đã bị xóa mềm trước đó.
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
}
