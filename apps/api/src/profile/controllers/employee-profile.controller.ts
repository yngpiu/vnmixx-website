import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Put, Req } from '@nestjs/common';
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
import { ChangePasswordDto } from '../../auth/dto/change-password.dto';
import type { AuthenticatedUser } from '../../auth/interfaces';
import { EmployeeProfileResponseDto, UpdateEmployeeProfileDto } from '../dto';
import { ProfileService } from '../services/profile.service';

/**
 * Controller xử lý hồ sơ cá nhân cho Nhân viên.
 * Cho phép nhân viên xem, cập nhật thông tin cơ bản và đổi mật khẩu của chính mình.
 */
@ApiTags('Profile')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/profile')
export class EmployeeProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({ summary: 'Lấy hồ sơ nhân viên hiện tại' })
  @ApiOkResponse({ type: EmployeeProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getEmployeeProfile(user.id);
  }

  @ApiOperation({ summary: 'Cập nhật hồ sơ nhân viên hiện tại' })
  @ApiOkResponse({
    type: EmployeeProfileResponseDto,
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
  ) {
    return this.profileService.updateEmployeeProfile(
      user.id,
      dto,
      buildAuditRequestContext(request, user),
    );
  }

  @ApiOperation({ summary: 'Đổi mật khẩu nhân viên hiện tại' })
  @ApiNoContentResponse({ description: 'Đổi mật khẩu thành công.' })
  @ApiBadRequestResponse({ description: 'Mật khẩu cũ không đúng hoặc dữ liệu không hợp lệ.' })
  @Put('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthenticatedUser) {
    return this.profileService.changeEmployeePassword(user.id, dto);
  }
}
