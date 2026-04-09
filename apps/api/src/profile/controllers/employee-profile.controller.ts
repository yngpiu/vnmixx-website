import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import { EmployeeProfileResponseDto, UpdateEmployeeProfileDto } from '../dto';
import { ProfileService } from '../services/profile.service';

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
  async updateProfile(
    @Body() dto: UpdateEmployeeProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.profileService.updateEmployeeProfile(user.id, dto);
  }
}
