import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import { CurrentUser, Public, RequireUserType } from '../decorators';
import {
  AuthResponseDto,
  ChangePasswordDto,
  CustomerRegisterResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  ForgotPasswordVerifyOtpDto,
  LoginDto,
  RegisterDto,
  ResendCustomerOtpDto,
  ResetPasswordDto,
  ResetTokenResponseDto,
  VerifyCustomerOtpDto,
} from '../dto';
import type { AuthenticatedUser } from '../interfaces';
import { CustomerAuthService } from '../services/customer-auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { TokenService } from '../services/token.service';
import { authBodyFromPair, extractRequestMeta } from '../utils';

@Throttle({ default: { ttl: 60_000, limit: 10 } })
@ApiTags('Auth')
@Controller('auth')
/**
 * Controller xử lý các yêu cầu xác thực dành cho Khách hàng (Public API).
 * Bao gồm các luồng: Đăng ký, Đăng nhập, Xác thực OTP và Quên mật khẩu.
 */
export class CustomerAuthController {
  constructor(
    private readonly customerAuth: CustomerAuthService,
    private readonly passwordReset: PasswordResetService,
    private readonly tokenService: TokenService,
  ) {}

  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng mới và gửi OTP qua email' })
  @ApiCreatedResponse({
    type: CustomerRegisterResponseDto,
    description: 'Đăng ký khách hàng thành công. OTP xác thực đã được gửi qua email.',
  })
  @ApiConflictResponse({ description: 'Email hoặc số điện thoại đã được đăng ký.' })
  @Public()
  @Post('register')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  /** Đăng ký tài khoản mới: Lưu thông tin tạm thời và gửi OTP kích hoạt. */
  async register(@Body() dto: RegisterDto): Promise<CustomerRegisterResponseDto> {
    return this.customerAuth.registerCustomer(dto);
  }

  @ApiOperation({ summary: 'Xác thực OTP email khách hàng và đăng nhập' })
  @ApiOkResponse({
    type: AuthResponseDto,
    description:
      'Xác thực OTP thành công. Trả accessToken trong JSON; refresh token trong cookie HttpOnly.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Bạn đã thử OTP quá nhiều lần. Vui lòng thử lại sau.',
  })
  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  /** Xác thực OTP: Nếu đúng, kích hoạt tài khoản và cấp cặp token truy cập. */
  async verifyOtp(
    @Body() dto: VerifyCustomerOtpDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const identity = await this.customerAuth.verifyCustomerOtp(dto);
    const pair = await this.tokenService.issueTokenPair(
      identity,
      'CUSTOMER',
      extractRequestMeta(req),
    );
    return authBodyFromPair(pair);
  }

  @ApiOperation({ summary: 'Gửi lại OTP xác thực email khách hàng' })
  @ApiOkResponse({
    type: CustomerRegisterResponseDto,
    description: 'Đã gửi lại OTP xác thực thành công.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Quá nhiều yêu cầu. Vui lòng chờ trước khi yêu cầu OTP mới.',
  })
  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  /** Gửi lại mã OTP kích hoạt (có áp dụng cooldown). */
  async resendOtp(@Body() dto: ResendCustomerOtpDto): Promise<CustomerRegisterResponseDto> {
    return this.customerAuth.resendCustomerOtp(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Đăng nhập với vai trò khách hàng' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Đăng nhập khách hàng thành công.' })
  @ApiUnauthorizedResponse({
    description: 'Thông tin đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa.',
  })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  /** Đăng nhập bằng email/mật khẩu và nhận cặp token truy cập. */
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const identity = await this.customerAuth.loginCustomer(dto);
    const pair = await this.tokenService.issueTokenPair(
      identity,
      'CUSTOMER',
      extractRequestMeta(req),
    );
    return authBodyFromPair(pair);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Đổi mật khẩu khách hàng và thu hồi toàn bộ phiên' })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Đổi mật khẩu thành công. Tất cả phiên đã bị thu hồi.',
  })
  @ApiUnauthorizedResponse({ description: 'Mật khẩu hiện tại không chính xác.' })
  @ApiBadRequestResponse({ description: 'Yêu cầu không hợp lệ hoặc không tìm thấy khách hàng.' })
  @RequireUserType('CUSTOMER')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiForbiddenResponse({ description: 'Bạn không có quyền thực hiện hành động này.' })
  /** Đổi mật khẩu cho người dùng đang đăng nhập và buộc đăng nhập lại trên mọi thiết bị. */
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    await this.customerAuth.changePassword(user.id, dto);
    await this.tokenService.logoutAll(user.id, 'CUSTOMER', user.jti, user.exp);
    return new MessageResponseDto('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Yêu cầu OTP đặt lại mật khẩu cho tài khoản khách hàng' })
  @ApiOkResponse({
    type: ForgotPasswordResponseDto,
    description: 'OTP đặt lại mật khẩu đã được gửi nếu tài khoản tồn tại và đã xác thực.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Quá nhiều yêu cầu. Vui lòng chờ trước khi yêu cầu OTP đặt lại mới.',
  })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  /** Bước 1 Quên mật khẩu: Gửi mã OTP khôi phục qua email. */
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    return this.passwordReset.requestPasswordReset(dto);
  }

  @ApiOperation({ summary: 'Xác thực OTP đặt lại mật khẩu và nhận mã đặt lại dùng một lần' })
  @ApiOkResponse({
    type: ResetTokenResponseDto,
    description: 'Xác thực OTP thành công. Đã cấp mã đặt lại.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Bạn đã thử OTP quá nhiều lần. Vui lòng thử lại sau.',
  })
  @ApiBadRequestResponse({ description: 'OTP không hợp lệ, đã hết hạn hoặc không chính xác.' })
  @Public()
  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  /** Bước 2 Quên mật khẩu: Kiểm tra OTP và cấp Reset Token (mã định danh đặt lại mật khẩu). */
  async forgotPasswordVerifyOtp(
    @Body() dto: ForgotPasswordVerifyOtpDto,
  ): Promise<ResetTokenResponseDto> {
    return this.passwordReset.verifyPasswordResetOtp(dto);
  }

  @ApiOperation({ summary: 'Đặt lại mật khẩu khách hàng bằng mã đặt lại hợp lệ' })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Đặt lại mật khẩu thành công. Tất cả phiên đã bị thu hồi.',
  })
  @ApiBadRequestResponse({ description: 'Mã đặt lại không hợp lệ hoặc đã hết hạn.' })
  @Public()
  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  /** Bước 3 Quên mật khẩu: Cập nhật mật khẩu mới bằng Reset Token và hủy mọi phiên làm việc cũ. */
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    const { customerId } = await this.passwordReset.resetPassword(dto);
    await this.tokenService.revokeAllSessions(customerId, 'CUSTOMER');
    return new MessageResponseDto('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
  }
}
