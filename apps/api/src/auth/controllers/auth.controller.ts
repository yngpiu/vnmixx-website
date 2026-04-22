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
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser, Public } from '../decorators';
import { AuthResponseDto, ProfileResponseDto } from '../dto';
import type { AuthenticatedUser } from '../interfaces';
import { TokenService } from '../services/token.service';
import {
  authBodyFromPair,
  clearRefreshTokenCookie,
  extractRequestMeta,
  readRefreshToken,
  setRefreshTokenCookie,
} from '../utils';

// Controller xử lý các hoạt động xác thực chung như làm mới token, đăng xuất và lấy thông tin cá nhân.
// Hỗ trợ cả cơ chế Cookie HttpOnly cho Refresh Token để tăng tính bảo mật.
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly tokenService: TokenService) {}

  // Cấp lại Access Token mới bằng Refresh Token.
  // Logic: Đọc Refresh Token từ Cookie hoặc Header, xác thực và thực hiện xoay vòng (rotation) token.
  @ApiOperation({
    summary: 'Làm mới mã truy cập bằng cookie mã làm mới',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Mã làm mới không hợp lệ hoặc đã hết hạn.' })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // 1. Đọc Refresh Token từ Cookie hoặc Authorization Header của request
    const raw = readRefreshToken(req);
    if (!raw) {
      throw new UnauthorizedException('Thiếu mã làm mới (cookie/header)');
    }
    // 2. Thực hiện làm mới cặp token (Token Rotation) thông qua TokenService
    const pair = await this.tokenService.refreshTokens(raw, extractRequestMeta(req));
    // 3. Thiết lập lại Refresh Token mới vào Cookie HttpOnly để đảm bảo an toàn
    setRefreshTokenCookie(res, pair.refreshToken);
    // 4. Trả về Access Token mới cho Client
    return authBodyFromPair(pair);
  }

  // Đăng xuất phiên làm việc hiện tại.
  // Vô hiệu hóa Refresh Token tương ứng và xóa Cookie ở phía Client.
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Đăng xuất',
  })
  @ApiOkResponse({ description: 'Đăng xuất thành công.' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    // 1. Thu hồi Refresh Token hiện tại và đưa Access Token vào Blacklist
    await this.tokenService.logout(readRefreshToken(req), user.jti, user.exp);
    // 2. Xóa Cookie Refresh Token ở trình duyệt người dùng
    clearRefreshTokenCookie(res);
    return { message: 'Đăng xuất thành công.' };
  }

  // Đăng xuất khỏi tất cả các thiết bị/phiên làm việc của người dùng.
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Đăng xuất tất cả thiết bị',
  })
  @ApiOkResponse({ description: 'Tất cả phiên đã được chấm dứt.' })
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async logoutAll(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    // 1. Thu hồi toàn bộ Refresh Token của người dùng và đánh dấu mốc thời gian Logout All
    await this.tokenService.logoutAll(user.id, user.userType, user.jti, user.exp);
    // 2. Dọn dẹp Cookie ở phía Client
    clearRefreshTokenCookie(res);
    return { message: 'Tất cả phiên đã được chấm dứt.' };
  }

  // Trả về thông tin chi tiết của người dùng đang đăng nhập dựa trên JWT.
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy hồ sơ người dùng đang đăng nhập' })
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập.' })
  @Get('me')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
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
