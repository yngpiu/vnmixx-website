import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Put, Req } from '@nestjs/common';
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
import { ChangePasswordDto } from '../../auth/dto/change-password.dto';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/response-schema.util';
import { ok, okNoData, type SuccessPayload } from '../../common/utils/response.util';
import { EmployeeProfileResponseDto, UpdateEmployeeProfileDto } from '../dto';
import { ProfileService } from '../services/profile.service';

// Xử lý hồ sơ cá nhân cho Nhân viên.
// Cho phép nhân viên tự quản lý thông tin cá nhân và bảo mật tài khoản.
@ApiTags('Profile')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@ApiExtraModels(EmployeeProfileResponseDto)
@RequireUserType('EMPLOYEE')
@Controller('admin/profile')
export class EmployeeProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Lấy thông tin cá nhân của nhân viên đang đăng nhập.
  @ApiOperation({ summary: 'Lấy hồ sơ nhân viên hiện tại' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(EmployeeProfileResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<EmployeeProfileResponseDto>> {
    return ok(
      await this.profileService.getEmployeeProfile(user.id),
      'Lấy hồ sơ nhân viên thành công.',
    );
  }

  // Cập nhật các thông tin cơ bản của nhân viên khi có thay đổi.
  @ApiOperation({ summary: 'Cập nhật hồ sơ nhân viên hiện tại' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(EmployeeProfileResponseDto) }),
    description: 'Cập nhật hồ sơ nhân viên thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Xác thực dữ liệu thất bại hoặc không có trường nào được cung cấp.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async updateProfile(
    @Body() dto: UpdateEmployeeProfileDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<EmployeeProfileResponseDto>> {
    return ok(
      await this.profileService.updateEmployeeProfile(
        user.id,
        dto,
        buildAuditRequestContext(request, user),
      ),
      'Cập nhật hồ sơ nhân viên thành công.',
    );
  }

  // Thay đổi mật khẩu định kỳ hoặc khi nghi ngờ lộ thông tin để đảm bảo an toàn tài khoản.
  @ApiOperation({ summary: 'Đổi mật khẩu nhân viên hiện tại' })
  @ApiOkResponse({
    description: 'Đổi mật khẩu nhân viên thành công.',
    schema: buildNullDataSuccessResponseSchema('Đổi mật khẩu khách hàng thành công.'),
  })
  @ApiBadRequestResponse({ description: 'Mật khẩu cũ không đúng hoặc dữ liệu không hợp lệ.' })
  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<null>> {
    await this.profileService.changeEmployeePassword(user.id, dto);
    return okNoData('Đổi mật khẩu nhân viên thành công.');
  }
}
