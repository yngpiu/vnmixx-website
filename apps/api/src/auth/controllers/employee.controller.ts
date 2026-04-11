import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../decorators';
import { AuthResponseDto, LoginDto } from '../dto';
import { EmployeeAuthService } from '../services/employee-auth.service';
import { TokenService } from '../services/token.service';
import { authBodyFromPair, extractRequestMeta, setRefreshTokenCookie } from '../utils';

@Throttle({ default: { ttl: 60_000, limit: 5 } })
@ApiTags('Auth')
@Controller('auth/admin')
export class EmployeeAuthController {
  constructor(
    private readonly employeeAuth: EmployeeAuthService,
    private readonly tokenService: TokenService,
  ) {}

  @ApiOperation({ summary: 'Đăng nhập với vai trò nhân viên' })
  @ApiOkResponse({
    type: AuthResponseDto,
    description:
      'Đăng nhập nhân viên thành công (accessToken trong JSON; refresh trong cookie HttpOnly).',
  })
  @ApiUnauthorizedResponse({
    description: 'Thông tin đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa.',
  })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, roles, permissions } = await this.employeeAuth.loginEmployee(dto);
    const pair = await this.tokenService.issueTokenPair(
      user,
      'EMPLOYEE',
      extractRequestMeta(req),
      roles,
      permissions,
    );
    setRefreshTokenCookie(res, pair.refreshToken);
    return authBodyFromPair(pair);
  }
}
