import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
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
import { TokenService } from '../services/token.service';
import { extractRequestMeta } from '../utils';

@Throttle({ default: { ttl: 60_000, limit: 10 } })
@ApiTags('Auth')
@Controller('auth')
export class CustomerAuthController {
  constructor(
    private readonly customerAuth: CustomerAuthService,
    private readonly tokenService: TokenService,
  ) {}

  @ApiOperation({ summary: 'Register a new customer account and send email OTP' })
  @ApiCreatedResponse({
    type: CustomerRegisterResponseDto,
    description: 'Customer registered. Email verification OTP sent.',
  })
  @ApiConflictResponse({ description: 'Email or phone number is already registered' })
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<CustomerRegisterResponseDto> {
    return this.customerAuth.registerCustomer(dto);
  }

  @ApiOperation({ summary: 'Verify customer email OTP and issue token pair' })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'OTP verified. Access and refresh tokens issued.',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many incorrect OTP attempts or resend abuse' })
  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyCustomerOtpDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const identity = await this.customerAuth.verifyCustomerOtp(dto);
    return this.tokenService.issueTokenPair(identity, 'CUSTOMER', extractRequestMeta(req));
  }

  @ApiOperation({ summary: 'Resend customer email verification OTP' })
  @ApiOkResponse({
    type: CustomerRegisterResponseDto,
    description: 'A new verification OTP has been sent.',
  })
  @ApiTooManyRequestsResponse({ description: 'Please wait before requesting another OTP' })
  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendCustomerOtpDto): Promise<CustomerRegisterResponseDto> {
    return this.customerAuth.resendCustomerOtp(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Log in as a customer' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Login successful' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or account inactive' })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const identity = await this.customerAuth.loginCustomer(dto);
    return this.tokenService.issueTokenPair(identity, 'CUSTOMER', extractRequestMeta(req));
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change customer password and revoke all sessions' })
  @ApiOkResponse({ description: 'Password changed successfully. All sessions terminated.' })
  @ApiUnauthorizedResponse({ description: 'Current password is incorrect' })
  @ApiBadRequestResponse({ description: 'Invalid request or customer not found' })
  @RequireUserType('CUSTOMER')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.customerAuth.changePassword(user.id, dto);
    await this.tokenService.logoutAll(user.id, 'CUSTOMER', user.jti, user.exp);
    return { message: 'Password changed successfully. Please log in again.' };
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Request a password reset OTP for a customer account' })
  @ApiOkResponse({
    type: ForgotPasswordResponseDto,
    description: 'Reset OTP sent to the provided email (if account exists and is verified).',
  })
  @ApiTooManyRequestsResponse({ description: 'Please wait before requesting another reset code' })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    return this.customerAuth.requestPasswordReset(dto);
  }

  @ApiOperation({ summary: 'Verify password reset OTP and receive a one-time reset token' })
  @ApiOkResponse({
    type: ResetTokenResponseDto,
    description: 'OTP verified. Reset token issued for the password reset step.',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many incorrect OTP attempts' })
  @ApiBadRequestResponse({ description: 'OTP is invalid, expired, or incorrect' })
  @Public()
  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordVerifyOtp(
    @Body() dto: ForgotPasswordVerifyOtpDto,
  ): Promise<ResetTokenResponseDto> {
    return this.customerAuth.verifyPasswordResetOtp(dto);
  }

  @ApiOperation({ summary: 'Reset customer password using a valid reset token' })
  @ApiOkResponse({ description: 'Password reset successfully. All sessions terminated.' })
  @ApiBadRequestResponse({ description: 'Reset token is invalid or expired' })
  @Public()
  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    const { customerId } = await this.customerAuth.resetPassword(dto);
    await this.tokenService.revokeAllSessions(customerId, 'CUSTOMER');
    return { message: 'Password reset successfully. Please log in again.' };
  }
}
