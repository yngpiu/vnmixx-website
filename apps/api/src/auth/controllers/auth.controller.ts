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

  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'New token pair issued' })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid, expired, or already used' })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.tokenService.refreshTokens(dto.refreshToken, extractRequestMeta(req));
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Log out current session (revoke refresh token + blacklist access token)',
  })
  @ApiOkResponse({ description: 'Logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.tokenService.logout(dto.refreshToken, user.jti, user.exp);
    return { message: 'Logged out successfully' };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Log out all sessions (revoke all refresh tokens and invalidate all current access tokens)',
  })
  @ApiOkResponse({ description: 'All sessions terminated' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<{ message: string }> {
    await this.tokenService.logoutAll(user.id, user.userType, user.jti, user.exp);
    return { message: 'All sessions have been terminated' };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get profile of the currently authenticated user' })
  @ApiOkResponse({ type: ProfileResponseDto, description: 'Current user profile' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Token has been revoked' })
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
