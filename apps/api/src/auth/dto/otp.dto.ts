import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class VerifyCustomerOtpDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Customer email used during registration',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP sent to email' })
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit numeric code' })
  otp: string;
}

export class ResendCustomerOtpDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Customer email waiting for verification',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CustomerRegisterResponseDto {
  @ApiProperty({
    example: 'Registration successful. Please verify your email using the OTP sent.',
  })
  message: string;

  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email that received the verification OTP',
  })
  email: string;

  @ApiProperty({ example: 300, description: 'OTP lifetime in seconds' })
  otpExpiresIn: number;

  @ApiProperty({ example: 60, description: 'Seconds to wait before requesting a new OTP' })
  resendAfter: number;
}
