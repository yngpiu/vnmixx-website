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
import { CurrentUser, RequirePermissions, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  CreateEmployeeDto,
  EmployeeDetailResponseDto,
  EmployeeListResponseDto,
  ListEmployeesQueryDto,
  ResetEmployeePasswordDto,
  UpdateEmployeeDto,
} from '../dto';
import { EmployeeService } from '../services/employee.service';

@ApiTags('Employees')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(EmployeeListResponseDto, EmployeeDetailResponseDto)
@Controller('admin/employees')
// Controller quản trị nhân viên hệ thống - Quản lý tài khoản, vai trò và trạng thái
export class EmployeeAdminController {
  constructor(private readonly employeeService: EmployeeService) {}

  // API lấy danh sách nhân viên có phân trang, tìm kiếm và lọc theo vai trò/trạng thái
  @ApiOperation({
    summary: 'Lấy danh sách nhân viên',
    description: 'Hỗ trợ phân trang, tìm kiếm theo tên/email/phone và lọc theo nhiều tiêu chí.',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(EmployeeListResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @RequirePermissions('employee.read')
  @Get()
  async findAll(
    @Query() query: ListEmployeesQueryDto,
  ): Promise<SuccessPayload<EmployeeListResponseDto>> {
    return ok(
      await this.employeeService.findList({
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        search: query.search,
        status: query.status,
        isSoftDeleted: query.isSoftDeleted,
        roleId: query.roleId,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      'Lấy danh sách nhân viên thành công.',
    );
  }

  // API lấy thông tin chi tiết một nhân viên cụ thể kèm theo các vai trò đang gán
  @ApiOperation({ summary: 'Lấy chi tiết nhân viên' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(EmployeeDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @RequirePermissions('employee.read')
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<EmployeeDetailResponseDto>> {
    return ok(await this.employeeService.findById(id), 'Lấy chi tiết nhân viên thành công.');
  }

  // API tạo tài khoản nhân viên mới và gán danh sách vai trò ban đầu
  @ApiOperation({ summary: 'Tạo nhân viên mới' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(EmployeeDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ hoặc ID vai trò không tồn tại.' })
  @ApiConflictResponse({ description: 'Email hoặc số điện thoại đã được sử dụng.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @RequirePermissions('employee.create')
  @Post()
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<EmployeeDetailResponseDto>> {
    return ok(
      await this.employeeService.create(dto, buildAuditRequestContext(request, user)),
      'Tạo nhân viên thành công.',
    );
  }

  // API cập nhật trạng thái hoạt động (ACTIVE/INACTIVE) hoặc thay đổi danh sách vai trò
  @ApiOperation({ summary: 'Cập nhật nhân viên' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(EmployeeDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @ApiBadRequestResponse({
    description:
      'Dữ liệu không hợp lệ, ID vai trò không tồn tại, hoặc cố gắng sửa tài khoản hệ thống.',
  })
  @ApiConflictResponse({ description: 'Email hoặc số điện thoại mới đã được sử dụng.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @RequirePermissions('employee.update')
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<EmployeeDetailResponseDto>> {
    return ok(
      await this.employeeService.update(id, dto, buildAuditRequestContext(request, user)),
      'Cập nhật nhân viên thành công.',
    );
  }

  // Xóa mềm nhân viên: nhân viên sẽ bị vô hiệu hóa và không thể đăng nhập.
  @ApiOperation({ summary: 'Xóa mềm nhân viên' })
  @ApiNoContentResponse({
    description: 'Xóa mềm nhân viên thành công.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @ApiBadRequestResponse({
    description: 'Không được phép xóa tài khoản quản trị tối cao hoặc chính mình.',
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @RequirePermissions('employee.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    await this.employeeService.softDelete(id, buildAuditRequestContext(request, user), user.id);
  }

  // Khôi phục nhân viên từ trạng thái đã xóa mềm về trạng thái hoạt động bình thường.
  @ApiOperation({ summary: 'Khôi phục nhân viên đã xóa mềm' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(EmployeeDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy bản ghi nhân viên đang bị xóa mềm.' })
  @ApiBadRequestResponse({ description: 'Nhân viên không ở trạng thái bị xóa hoặc không tồn tại.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @RequirePermissions('employee.update')
  @Patch(':id/restore')
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<EmployeeDetailResponseDto>> {
    return ok(
      await this.employeeService.restore(id, buildAuditRequestContext(request, user)),
      'Khôi phục nhân viên thành công.',
    );
  }

  @ApiOperation({ summary: 'Đặt lại mật khẩu nhân viên' })
  @ApiNoContentResponse({
    description: 'Đặt lại mật khẩu nhân viên thành công.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu mật khẩu không hợp lệ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @RequirePermissions('employee.update')
  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetEmployeePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    await this.employeeService.resetPassword(
      id,
      dto.newPassword,
      buildAuditRequestContext(request, user),
    );
  }
}
