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
    description: 'Địa chỉ email của tài khoản khách hàng',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ForgotPasswordVerifyOtpDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Địa chỉ email của tài khoản khách hàng',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số được gửi qua email' })
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP phải là mã số gồm 6 chữ số' })
  otp: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Địa chỉ email của tài khoản khách hàng',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Mã đặt lại dùng một lần nhận được sau khi xác thực OTP',
  })
  @IsUUID()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({ description: 'Mật khẩu mới (8-72 ký tự)', minLength: 8, maxLength: 72 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example: 'Mã đặt lại mật khẩu đã được gửi tới email của bạn.',
  })
  message: string;

  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email đã nhận OTP đặt lại mật khẩu',
  })
  email: string;

  @ApiProperty({ example: 300, description: 'Thời hạn OTP (giây)' })
  otpExpiresIn: number;

  @ApiProperty({ example: 60, description: 'Số giây cần chờ trước khi yêu cầu OTP mới' })
  resendAfter: number;
}

export class ResetTokenResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Token dùng một lần để xác thực bước đặt lại mật khẩu',
  })
  resetToken: string;
}
