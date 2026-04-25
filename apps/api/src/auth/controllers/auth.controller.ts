import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
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
import type { Request } from 'express';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
  ok,
  okNoData,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { CurrentUser, Public } from '../decorators';
import { AuthResponseDto, ProfileResponseDto } from '../dto';
import type { AuthenticatedUser } from '../interfaces';
import { TokenService } from '../services/token.service';
import { authBodyFromPair, extractRequestMeta, readRefreshToken } from '../utils';

// Controller xử lý các hoạt động xác thực chung như làm mới token, đăng xuất và lấy thông tin cá nhân.
@ApiTags('Auth')
@ApiExtraModels(AuthResponseDto, ProfileResponseDto)
@Controller('auth')
export class AuthController {
  constructor(private readonly tokenService: TokenService) {}

  // Cấp lại Access Token mới bằng Refresh Token.
  // Logic: Đọc Refresh Token từ Header, xác thực và thực hiện xoay vòng (rotation) token.
  @ApiOperation({
    summary: 'Làm mới mã truy cập bằng refresh token',
  })
  @ApiOkResponse({ schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AuthResponseDto) }) })
  @ApiUnauthorizedResponse({ description: 'Mã làm mới không hợp lệ hoặc đã hết hạn.' })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async refreshToken(@Req() req: Request): Promise<SuccessPayload<AuthResponseDto>> {
    // 1. Đọc Refresh Token từ Authorization Header của request
    const raw = readRefreshToken(req);
    if (!raw) {
      throw new UnauthorizedException('Thiếu mã làm mới (header)');
    }
    // 2. Thực hiện làm mới cặp token (Token Rotation) thông qua TokenService
    const pair = await this.tokenService.refreshTokens(raw, extractRequestMeta(req));
    // 3. Trả về cặp token mới cho Client
    return ok(authBodyFromPair(pair), 'Làm mới mã truy cập thành công.');
  }

  // Đăng xuất phiên làm việc hiện tại.
  // Vô hiệu hóa Refresh Token tương ứng và xóa Cookie ở phía Client.
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Đăng xuất',
  })
  @ApiOkResponse({
    description: 'Đăng xuất thành công.',
    schema: buildNullDataSuccessResponseSchema('Đăng xuất thành công.'),
  })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async logout(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<null>> {
    // Thu hồi Refresh Token hiện tại và đưa Access Token vào Blacklist
    await this.tokenService.logout(readRefreshToken(req), user.jti, user.exp);
    return okNoData('Đăng xuất thành công.');
  }

  // Đăng xuất khỏi tất cả các thiết bị/phiên làm việc của người dùng.
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Đăng xuất tất cả thiết bị',
  })
  @ApiOkResponse({
    description: 'Tất cả phiên đã được chấm dứt.',
    schema: buildNullDataSuccessResponseSchema('Tất cả phiên đã được chấm dứt.'),
  })
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<SuccessPayload<null>> {
    // Thu hồi toàn bộ Refresh Token của người dùng và đánh dấu mốc thời gian Logout All
    await this.tokenService.logoutAll(user.id, user.userType, user.jti, user.exp);
    return okNoData('Tất cả phiên đã được chấm dứt.');
  }

  // Trả về thông tin chi tiết của người dùng đang đăng nhập dựa trên JWT.
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy hồ sơ người dùng đang đăng nhập' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProfileResponseDto) }),
  })
  @ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập.' })
  @Get('me')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  getProfile(@CurrentUser() user: AuthenticatedUser): SuccessPayload<ProfileResponseDto> {
    return ok(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl ?? null,
        userType: user.userType,
        roles: user.roles,
        permissions: user.permissions,
      },
      'Lấy hồ sơ người dùng thành công.',
    );
  }
}
