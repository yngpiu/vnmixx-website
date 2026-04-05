import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email address of the customer account',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ForgotPasswordVerifyOtpDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email address of the customer account',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP sent to email' })
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit numeric code' })
  otp: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email address of the customer account',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'One-time reset token received after OTP verification',
  })
  @IsUUID()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({ description: 'New password (8–72 characters)', minLength: 8, maxLength: 72 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example: 'A password reset code has been sent to your email.',
  })
  message: string;

  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email that received the password reset OTP',
  })
  email: string;

  @ApiProperty({ example: 300, description: 'OTP lifetime in seconds' })
  otpExpiresIn: number;

  @ApiProperty({ example: 60, description: 'Seconds to wait before requesting a new OTP' })
  resendAfter: number;
}

export class ResetTokenResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'One-time token to authorize the password reset step',
  })
  resetToken: string;
}
