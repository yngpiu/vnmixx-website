import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, Public } from '../decorators';
import { AuthResponseDto, ProfileResponseDto, RefreshTokenDto } from '../dto';
import type { AuthenticatedUser } from '../interfaces';
import { TokenService } from '../services/token.service';
import { extractRequestMeta } from '../utils';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly tokenService: TokenService) {}

  @ApiOperation({ summary: 'Làm mới mã truy cập bằng mã làm mới' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Làm mới cặp token thành công.' })
  @ApiUnauthorizedResponse({
    description: 'Mã làm mới không hợp lệ, đã hết hạn hoặc đã được sử dụng.',
  })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.tokenService.refreshTokens(dto.refreshToken, extractRequestMeta(req));
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
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.tokenService.logout(dto.refreshToken, user.jti, user.exp);
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
  async logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<{ message: string }> {
    await this.tokenService.logoutAll(user.id, user.userType, user.jti, user.exp);
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
      userType: user.userType,
      roles: user.roles,
      permissions: user.permissions,
    };
  }
}
