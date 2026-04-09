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
    description: 'Customer registered successfully. Verification OTP has been sent via email.',
  })
  @ApiConflictResponse({ description: 'Email or phone number is already registered.' })
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<CustomerRegisterResponseDto> {
    return this.customerAuth.registerCustomer(dto);
  }

  @ApiOperation({ summary: 'Verify customer email OTP and issue token pair' })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'OTP verified successfully. Token pair issued.',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many OTP attempts. Please try again later.' })
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
    description: 'Verification OTP has been resent successfully.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests. Please wait before requesting another OTP.',
  })
  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendCustomerOtpDto): Promise<CustomerRegisterResponseDto> {
    return this.customerAuth.resendCustomerOtp(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Log in as a customer' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Customer logged in successfully.' })
  @ApiUnauthorizedResponse({ description: 'Credentials are invalid or account is inactive.' })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const identity = await this.customerAuth.loginCustomer(dto);
    return this.tokenService.issueTokenPair(identity, 'CUSTOMER', extractRequestMeta(req));
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change customer password and revoke all sessions' })
  @ApiOkResponse({ description: 'Password changed successfully. All sessions have been revoked.' })
  @ApiUnauthorizedResponse({ description: 'Current password is incorrect.' })
  @ApiBadRequestResponse({ description: 'Request is invalid or customer was not found.' })
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
    description: 'Password reset OTP has been sent if the account exists and is verified.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests. Please wait before requesting another reset OTP.',
  })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    return this.customerAuth.requestPasswordReset(dto);
  }

  @ApiOperation({ summary: 'Verify password reset OTP and receive a one-time reset token' })
  @ApiOkResponse({
    type: ResetTokenResponseDto,
    description: 'OTP verified successfully. Reset token issued.',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many OTP attempts. Please try again later.' })
  @ApiBadRequestResponse({ description: 'OTP is invalid, expired, or incorrect.' })
  @Public()
  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordVerifyOtp(
    @Body() dto: ForgotPasswordVerifyOtpDto,
  ): Promise<ResetTokenResponseDto> {
    return this.customerAuth.verifyPasswordResetOtp(dto);
  }

  @ApiOperation({ summary: 'Reset customer password using a valid reset token' })
  @ApiOkResponse({ description: 'Password reset successfully. All sessions have been revoked.' })
  @ApiBadRequestResponse({ description: 'Reset token is invalid or expired.' })
  @Public()
  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    const { customerId } = await this.customerAuth.resetPassword(dto);
    await this.tokenService.revokeAllSessions(customerId, 'CUSTOMER');
    return { message: 'Password reset successfully. Please log in again.' };
  }
}
