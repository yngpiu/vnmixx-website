import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { REFRESH_TOKEN_COOKIE_NAME } from '../constants';
import { CurrentUser, Public } from '../decorators';
import { AuthResponseDto, ProfileResponseDto } from '../dto';
import type { AuthenticatedUser } from '../interfaces';
import { TokenService } from '../services/token.service';
import {
  authBodyFromPair,
  clearRefreshTokenCookie,
  extractRequestMeta,
  readRefreshTokenFromCookie,
  setRefreshTokenCookie,
} from '../utils';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly tokenService: TokenService) {}

  @ApiOperation({
    summary: 'Làm mới mã truy cập bằng cookie mã làm mới',
    description: `Đọc refresh token từ cookie HttpOnly \`${REFRESH_TOKEN_COOKIE_NAME}\` (path /auth).`,
  })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'Làm mới mã truy cập thành công; cookie refresh được xoay vòng.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thiếu cookie mã làm mới, hoặc mã không hợp lệ / hết hạn / đã dùng.',
  })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const raw = readRefreshTokenFromCookie(req);
    if (!raw) {
      throw new UnauthorizedException('Thiếu mã làm mới (cookie)');
    }
    const pair = await this.tokenService.refreshTokens(raw, extractRequestMeta(req));
    setRefreshTokenCookie(res, pair.refreshToken);
    return authBodyFromPair(pair);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Đăng xuất phiên hiện tại',
  })
  @ApiOkResponse({ description: 'Đăng xuất phiên hiện tại thành công.' })
  @ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.tokenService.logout(readRefreshTokenFromCookie(req), user.jti, user.exp);
    clearRefreshTokenCookie(res);
    return { message: 'Đăng xuất thành công.' };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Đăng xuất tất cả phiên',
  })
  @ApiOkResponse({ description: 'Đăng xuất tất cả phiên thành công.' })
  @ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.tokenService.logoutAll(user.id, user.userType, user.jti, user.exp);
    clearRefreshTokenCookie(res);
    return { message: 'Tất cả phiên đã được chấm dứt.' };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy hồ sơ người dùng đang đăng nhập' })
  @ApiOkResponse({
    type: ProfileResponseDto,
    description: 'Lấy hồ sơ người dùng đã xác thực thành công.',
  })
  @ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
  @ApiForbiddenResponse({ description: 'Mã truy cập đã bị thu hồi.' })
  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser): ProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl ?? null,
      userType: user.userType,
      roles: user.roles,
      permissions: user.permissions,
    };
  }
}
