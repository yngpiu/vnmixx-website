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
  CreateEmployeeDto,
  EmployeeDetailResponseDto,
  EmployeeListResponseDto,
  ListEmployeesQueryDto,
  UpdateEmployeeDto,
} from '../dto';
import { EmployeeService } from '../services/employee.service';

@ApiTags('Employees')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/employees')
export class EmployeeAdminController {
  constructor(private readonly employeeService: EmployeeService) {}

  @ApiOperation({
    summary: 'Liệt kê nhân viên',
    description:
      'Danh sách phân trang: tìm kiếm, lọc hoạt động, lọc vai trò. Mặc định chỉ bản ghi chưa xóa; `onlyDeleted=true` chỉ bản đã xóa; `isSoftDeleted=true` gồm cả hai.',
  })
  @ApiOkResponse({ type: EmployeeListResponseDto })
  @Get()
  findAll(@Query() query: ListEmployeesQueryDto) {
    return this.employeeService.findList({
      page: query.page!,
      limit: query.limit!,
      search: query.search,
      isActive: query.isActive,
      isSoftDeleted: query.isSoftDeleted,
      onlyDeleted: query.onlyDeleted,
      roleId: query.roleId,
    });
  }

  @ApiOperation({ summary: 'Lấy chi tiết nhân viên theo ID' })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.findById(id);
  }

  @ApiOperation({ summary: 'Tạo nhân viên mới' })
  @ApiCreatedResponse({ type: EmployeeDetailResponseDto })
  @ApiBadRequestResponse({
    description: 'Xác thực dữ liệu thất bại hoặc có ID vai trò không tồn tại.',
  })
  @ApiConflictResponse({ description: 'Email hoặc số điện thoại đã được sử dụng.' })
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  @ApiOperation({
    summary: 'Cập nhật nhân viên',
    description: 'Chỉ cho phép đổi trạng thái hoạt động và/hoặc đồng bộ vai trò.',
  })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiBadRequestResponse({
    description:
      'Không có trường nào được gửi, xác thực dữ liệu thất bại, hoặc có ID vai trò không tồn tại.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa mềm nhân viên' })
  @ApiNoContentResponse({ description: 'Xóa nhân viên thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.employeeService.softDelete(id);
  }

  @ApiOperation({ summary: 'Khôi phục nhân viên đã xóa mềm' })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên hoặc nhân viên chưa bị xóa.' })
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.restore(id);
  }
}
