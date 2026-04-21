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
import { CurrentUser, RequirePermissions, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  CreateEmployeeDto,
  EmployeeDetailResponseDto,
  EmployeeListResponseDto,
  ListEmployeesQueryDto,
  UpdateEmployeeDto,
} from '../dto';
import { EmployeeService } from '../services/employee.service';

// Controller quản trị nhân viên hệ thống - Quản lý tài khoản, vai trò và trạng thái
@ApiTags('Employees')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/employees')
export class EmployeeAdminController {
  constructor(private readonly employeeService: EmployeeService) {}

  // API lấy danh sách nhân viên có phân trang, tìm kiếm và lọc theo vai trò/trạng thái
  @ApiOperation({
    summary: 'Liệt kê nhân viên',
    description: 'Hỗ trợ phân trang, tìm kiếm theo tên/email/phone và lọc theo nhiều tiêu chí.',
  })
  @ApiOkResponse({ type: EmployeeListResponseDto })
  @RequirePermissions('employee.read')
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(@Query() query: ListEmployeesQueryDto): Promise<EmployeeListResponseDto> {
    return this.employeeService.findList({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      status: query.status,
      isSoftDeleted: query.isSoftDeleted,
      roleId: query.roleId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  // API lấy thông tin chi tiết một nhân viên cụ thể kèm theo các vai trò đang gán
  @ApiOperation({ summary: 'Lấy chi tiết nhân viên' })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @RequirePermissions('employee.read')
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<EmployeeDetailResponseDto> {
    return this.employeeService.findById(id);
  }

  // API tạo tài khoản nhân viên mới và gán danh sách vai trò ban đầu
  @ApiOperation({ summary: 'Tạo nhân viên mới' })
  @ApiCreatedResponse({ type: EmployeeDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ hoặc ID vai trò không tồn tại.' })
  @ApiConflictResponse({ description: 'Email hoặc số điện thoại đã được sử dụng.' })
  @RequirePermissions('employee.create')
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<EmployeeDetailResponseDto> {
    return this.employeeService.create(dto, buildAuditRequestContext(request, user));
  }

  // API cập nhật trạng thái hoạt động (ACTIVE/INACTIVE) hoặc thay đổi danh sách vai trò
  @ApiOperation({ summary: 'Cập nhật nhân viên' })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @ApiBadRequestResponse({
    description:
      'Dữ liệu không hợp lệ, ID vai trò không tồn tại, hoặc cố gắng sửa tài khoản hệ thống.',
  })
  @ApiConflictResponse({ description: 'Email hoặc số điện thoại mới đã được sử dụng.' })
  @RequirePermissions('employee.update')
  @Patch(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<EmployeeDetailResponseDto> {
    return this.employeeService.update(id, dto, buildAuditRequestContext(request, user));
  }

  // API xóa mềm nhân viên - Nhân viên sẽ bị vô hiệu hóa và không thể đăng nhập
  @ApiOperation({ summary: 'Xóa mềm nhân viên' })
  @ApiNoContentResponse({ description: 'Xóa nhân viên thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @ApiBadRequestResponse({
    description: 'Không được phép xóa tài khoản quản trị tối cao hoặc chính mình.',
  })
  @RequirePermissions('employee.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.employeeService.softDelete(id, buildAuditRequestContext(request, user), user.id);
  }

  // API khôi phục nhân viên từ trạng thái đã xóa mềm về trạng thái hoạt động bình thường
  @ApiOperation({ summary: 'Khôi phục nhân viên' })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy bản ghi nhân viên đang bị xóa mềm.' })
  @RequirePermissions('employee.update')
  @Patch(':id/restore')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<EmployeeDetailResponseDto> {
    return this.employeeService.restore(id, buildAuditRequestContext(request, user));
  }
}
