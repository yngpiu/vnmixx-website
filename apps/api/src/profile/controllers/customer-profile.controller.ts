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
import { CustomerProfileResponseDto, UpdateCustomerProfileDto } from '../dto';
import { ProfileService } from '../services/profile.service';

@ApiTags('Profile')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('profile')
export class CustomerProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({ summary: 'Lấy hồ sơ khách hàng hiện tại' })
  @ApiOkResponse({ type: CustomerProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getCustomerProfile(user.id);
  }

  @ApiOperation({ summary: 'Cập nhật hồ sơ khách hàng hiện tại' })
  @ApiOkResponse({
    type: CustomerProfileResponseDto,
    description: 'Cập nhật hồ sơ khách hàng thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Xác thực dữ liệu thất bại hoặc không có trường nào được cung cấp.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body() dto: UpdateCustomerProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.profileService.updateCustomerProfile(user.id, dto);
  }
}
