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
  CustomerDetailResponseDto,
  CustomerListResponseDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from '../dto';
import { CustomerService } from '../services/customer.service';

// Quản trị viên quản lý danh sách và trạng thái khách hàng của hệ thống.
// Hỗ trợ kiểm soát người dùng và xử lý các vấn đề liên quan đến tài khoản khách hàng.
@ApiTags('Customers')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(CustomerListResponseDto, CustomerDetailResponseDto)
@Controller('admin/customers')
export class CustomerAdminController {
  constructor(private readonly customerService: CustomerService) {}

  // Lấy danh sách khách hàng để theo dõi tăng trưởng và quản lý dữ liệu người dùng.
  @ApiOperation({
    summary: 'Lấy danh sách khách hàng',
    description: 'Phân trang, tìm kiếm theo tên/email/SĐT. Lọc theo `status` hoặc `isSoftDeleted`.',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CustomerListResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(
    @Query() query: ListCustomersQueryDto,
  ): Promise<SuccessPayload<CustomerListResponseDto>> {
    return ok(
      await this.customerService.findList({
        page: query.page!,
        limit: query.limit!,
        search: query.search,
        status: query.status,
        isSoftDeleted: query.isSoftDeleted,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      'Lấy danh sách khách hàng thành công.',
    );
  }

  // Xem chi tiết khách hàng để phục vụ việc đối soát và hỗ trợ kỹ thuật.
  @ApiOperation({ summary: 'Lấy chi tiết khách hàng theo ID' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CustomerDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<CustomerDetailResponseDto>> {
    return ok(await this.customerService.findById(id), 'Lấy chi tiết khách hàng thành công.');
  }

  // Điều chỉnh trạng thái hoạt động (khóa/mở khóa) tài khoản khách hàng.
  @ApiOperation({
    summary: 'Cập nhật khách hàng',
    description: 'Chỉ cho phép đổi trạng thái vận hành của khách hàng giữa ACTIVE và INACTIVE.',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CustomerDetailResponseDto) }),
  })
  @ApiBadRequestResponse({
    description:
      'Thiếu trạng thái, trạng thái không hợp lệ hoặc cố kích hoạt tài khoản chưa xác thực.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Patch(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<Awaited<ReturnType<CustomerService['update']>>>> {
    return ok(
      await this.customerService.update(id, dto, buildAuditRequestContext(request, user)),
      'Cập nhật khách hàng thành công.',
    );
  }

  // Xóa tài khoản khách hàng khi có yêu cầu hoặc vi phạm nghiêm trọng chính sách hệ thống.
  @ApiOperation({ summary: 'Xóa mềm khách hàng' })
  @ApiOkResponse({
    description: 'Xóa khách hàng thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa khách hàng thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.customerService.softDelete(id, buildAuditRequestContext(request, user));
    return okNoData('Xóa khách hàng thành công.');
  }

  // Khôi phục tài khoản khách hàng đã bị xóa trước đó.
  @ApiOperation({ summary: 'Khôi phục khách hàng đã xóa mềm' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CustomerDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng hoặc khách hàng chưa bị xóa.' })
  @Patch(':id/restore')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<Awaited<ReturnType<CustomerService['restore']>>>> {
    return ok(
      await this.customerService.restore(id, buildAuditRequestContext(request, user)),
      'Khôi phục khách hàng thành công.',
    );
  }
}
