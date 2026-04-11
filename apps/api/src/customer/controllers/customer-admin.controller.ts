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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
  CustomerDetailResponseDto,
  CustomerListResponseDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from '../dto';
import { CustomerService } from '../services/customer.service';

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
      'Danh sách phân trang: tìm kiếm, lọc hoạt động. Mặc định chỉ bản ghi chưa xóa; `onlyDeleted=true` chỉ đã xóa; `isSoftDeleted=true` gồm cả hai.',
  })
  @ApiOkResponse({ type: CustomerListResponseDto })
  @Get()
  findAll(@Query() query: ListCustomersQueryDto) {
    return this.customerService.findList({
      page: query.page!,
      limit: query.limit!,
      search: query.search,
      isActive: query.isActive,
      isSoftDeleted: query.isSoftDeleted,
      onlyDeleted: query.onlyDeleted,
    });
  }

  @ApiOperation({ summary: 'Lấy chi tiết khách hàng theo ID' })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Get(':id')
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
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.customerService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa mềm khách hàng' })
  @ApiNoContentResponse({ description: 'Xóa khách hàng thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.customerService.softDelete(id);
  }

  @ApiOperation({ summary: 'Khôi phục khách hàng đã xóa mềm' })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng hoặc khách hàng chưa bị xóa.' })
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.restore(id);
  }
}
