import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Put } from '@nestjs/common';
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
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import { ChangePasswordDto } from '../../auth/dto/change-password.dto';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/response-schema.util';
import { ok, okNoData, type SuccessPayload } from '../../common/utils/success-response.util';
import { CustomerProfileResponseDto, UpdateCustomerProfileDto } from '../dto';
import { ProfileService } from '../services/profile.service';

// Xử lý hồ sơ cá nhân cho Khách hàng.
// Giúp khách hàng cập nhật thông tin liên lạc và quản lý bảo mật tài khoản cá nhân.
@ApiTags('Profile')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@ApiExtraModels(CustomerProfileResponseDto)
@RequireUserType('CUSTOMER')
@Controller('profile')
export class CustomerProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Truy xuất thông tin cá nhân của khách hàng đang đăng nhập.
  @ApiOperation({ summary: 'Lấy hồ sơ khách hàng hiện tại' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CustomerProfileResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<Awaited<ReturnType<ProfileService['getCustomerProfile']>>>> {
    return ok(
      await this.profileService.getCustomerProfile(user.id),
      'Lấy hồ sơ khách hàng thành công.',
    );
  }

  // Cập nhật thông tin định danh và liên lạc của khách hàng.
  @ApiOperation({ summary: 'Cập nhật hồ sơ khách hàng hiện tại' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CustomerProfileResponseDto) }),
    description: 'Cập nhật hồ sơ khách hàng thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Xác thực dữ liệu thất bại hoặc không có trường nào được cung cấp.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy khách hàng.' })
  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async updateProfile(
    @Body() dto: UpdateCustomerProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<Awaited<ReturnType<ProfileService['updateCustomerProfile']>>>> {
    return ok(
      await this.profileService.updateCustomerProfile(user.id, dto),
      'Cập nhật hồ sơ khách hàng thành công.',
    );
  }

  // Đổi mật khẩu để tăng cường tính bảo mật cho tài khoản khách hàng.
  @ApiOperation({ summary: 'Đổi mật khẩu khách hàng hiện tại' })
  @ApiOkResponse({
    description: 'Đổi mật khẩu khách hàng thành công.',
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
    await this.profileService.changeCustomerPassword(user.id, dto);
    return okNoData('Đổi mật khẩu khách hàng thành công.');
  }
}
