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
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
  CustomerDetailResponseDto,
  CustomerListResponseDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from '../dto';
import { CustomerService } from '../services/customer.service';

/**
 * Controller dành cho quản trị viên để quản lý danh sách và trạng thái khách hàng.
 * Hỗ trợ liệt kê, tìm kiếm, xem chi tiết, cập nhật trạng thái hoạt động và xóa mềm/khôi phục tài khoản khách hàng.
 */
@ApiTags('Customers')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/customers')
export class CustomerAdminController {
  constructor(private readonly customerService: CustomerService) {}

  @ApiOperation({
    summary: 'Liệt kê khách hàng',
    description:
      'Phân trang, tìm kiếm theo tên/email/SĐT. Lọc theo trạng thái `isActive` hoặc `isSoftDeleted`.',
  })
  @ApiOkResponse({ type: CustomerListResponseDto })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findAll(@Query() query: ListCustomersQueryDto) {
    return this.customerService.findList({
      page: query.page!,
      limit: query.limit!,
      search: query.search,
      isActive: query.isActive,
      isSoftDeleted: query.isSoftDeleted,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @ApiOperation({ summary: 'Lấy chi tiết khách hàng theo ID' })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.findById(id);
  }

  @ApiOperation({
    summary: 'Cập nhật khách hàng',
    description: 'Chỉ cho phép đổi trạng thái hoạt động (kích hoạt / vô hiệu hóa).',
  })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiBadRequestResponse({
    description: 'Thiếu trạng thái hoặc xác thực dữ liệu thất bại.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Patch(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.customerService.update(id, dto, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Xóa mềm khách hàng' })
  @ApiNoContentResponse({ description: 'Xóa khách hàng thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.customerService.softDelete(id, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Khôi phục khách hàng đã xóa mềm' })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng hoặc khách hàng chưa bị xóa.' })
  @Patch(':id/restore')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.customerService.restore(id, buildAuditRequestContext(request, user));
  }
}
