import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import { ChangePasswordDto } from '../../auth/dto/change-password.dto';
import type { AuthenticatedUser } from '../../auth/interfaces';
import { TokenService } from '../../auth/services/token.service';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
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
@Controller('me/profile')
export class CustomerProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly tokenService: TokenService,
  ) {}

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
  @ApiNoContentResponse({
    description: 'Đổi mật khẩu khách hàng thành công. Vui lòng đăng nhập lại.',
    schema: buildNullDataSuccessResponseSchema(
      'Đổi mật khẩu khách hàng thành công. Vui lòng đăng nhập lại.',
    ),
  })
  @ApiBadRequestResponse({ description: 'Mật khẩu cũ không đúng hoặc dữ liệu không hợp lệ.' })
  @Put('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.profileService.changeCustomerPassword(user.id, dto);
    await this.tokenService.logoutAll(user.id, 'CUSTOMER', user.jti, user.exp);
  }
}
