import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../decorators';
import {
  AuthResponseDto,
  CustomerRegisterResponseDto,
  LoginDto,
  RegisterDto,
  ResendCustomerOtpDto,
  VerifyCustomerOtpDto,
} from '../dto';
import { CustomerAuthService } from '../services/customer-auth.service';
import { TokenService } from '../services/token.service';
import { extractRequestMeta } from '../utils';

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
}
