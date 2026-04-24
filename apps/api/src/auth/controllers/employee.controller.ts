import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/response-schema.util';
import { ok, okNoData, type SuccessPayload } from '../../common/utils/success-response.util';
import { CurrentUser, Public, RequireUserType } from '../decorators';
import { AuthResponseDto, ChangePasswordDto, LoginDto } from '../dto';
import type { AuthenticatedUser } from '../interfaces';
import { EmployeeAuthService } from '../services/employee-auth.service';
import { TokenService } from '../services/token.service';
import { authBodyFromPair, extractRequestMeta } from '../utils';

@Throttle({ default: { ttl: 60_000, limit: 40 } })
@ApiTags('Auth')
@ApiExtraModels(AuthResponseDto)
@Controller('auth/admin')
/**
 * Controller xử lý các yêu cầu xác thực dành cho Nhân viên và Quản trị viên (Admin API).
 * Cung cấp các chức năng: Đăng nhập hệ thống quản lý và Đổi mật khẩu nhân viên.
 */
export class EmployeeAuthController {
  constructor(
    private readonly employeeAuth: EmployeeAuthService,
    private readonly tokenService: TokenService,
  ) {}

  @ApiOperation({ summary: 'Đăng nhập với vai trò nhân viên' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AuthResponseDto) }),
    description:
      'Đăng nhập nhân viên thành công (accessToken trong JSON; refresh trong cookie HttpOnly).',
  })
  @ApiUnauthorizedResponse({
    description: 'Thông tin đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa.',
  })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  /** Đăng nhập nhân viên bằng email/mật khẩu và nhận token truy cập Dashboard. */
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<SuccessPayload<AuthResponseDto>> {
    const { user } = await this.employeeAuth.loginEmployee(dto);
    const pair = await this.tokenService.issueTokenPair(user, 'EMPLOYEE', extractRequestMeta(req));
    return ok(authBodyFromPair(pair), 'Đăng nhập nhân viên thành công.');
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Đổi mật khẩu nhân viên và thu hồi toàn bộ phiên' })
  @ApiOkResponse({
    description: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
    schema: buildNullDataSuccessResponseSchema('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'),
  })
  @ApiUnauthorizedResponse({ description: 'Mật khẩu hiện tại không chính xác.' })
  @ApiBadRequestResponse({ description: 'Yêu cầu không hợp lệ hoặc không tìm thấy nhân viên.' })
  @RequireUserType('EMPLOYEE')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiForbiddenResponse({ description: 'Bạn không có quyền thực hiện hành động này.' })
  /** Đổi mật khẩu nhân viên: Yêu cầu mật khẩu hiện tại và mật khẩu mới. */
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<null>> {
    await this.employeeAuth.changePassword(user.id, dto);
    await this.tokenService.logoutAll(user.id, 'EMPLOYEE', user.jti, user.exp);
    return okNoData('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
  }
}
