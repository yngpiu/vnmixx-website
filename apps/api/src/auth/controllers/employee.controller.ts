import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
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
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { Public } from '../decorators';
import { AuthResponseDto, EmployeeLoginDto } from '../dto';
import { EmployeeAuthService } from '../services/employee-auth.service';
import { TokenService } from '../services/token.service';
import { authBodyFromPair, extractRequestMeta } from '../utils';

@Throttle({ default: { ttl: 60_000, limit: 40 } })
@ApiTags('Auth')
@ApiExtraModels(AuthResponseDto)
@Controller('admin/auth')
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
    @Body() dto: EmployeeLoginDto,
    @Req() req: Request,
  ): Promise<SuccessPayload<AuthResponseDto>> {
    const { user } = await this.employeeAuth.loginEmployee(dto);
    const pair = await this.tokenService.issueTokenPair(user, 'EMPLOYEE', extractRequestMeta(req));
    return ok(authBodyFromPair(pair), 'Đăng nhập nhân viên thành công.');
  }
}
