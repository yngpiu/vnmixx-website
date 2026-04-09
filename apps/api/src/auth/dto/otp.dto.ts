import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class VerifyCustomerOtpDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email khách hàng dùng trong lúc đăng ký',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số được gửi qua email' })
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP phải là mã số gồm 6 chữ số' })
  otp: string;
}

export class ResendCustomerOtpDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email khách hàng đang chờ xác thực',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CustomerRegisterResponseDto {
  @ApiProperty({
    example: 'Đăng ký thành công. Vui lòng xác thực email bằng mã OTP đã gửi.',
  })
  message: string;

  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email đã nhận OTP xác thực',
  })
  email: string;

  @ApiProperty({ example: 300, description: 'Thời hạn OTP (giây)' })
  otpExpiresIn: number;

  @ApiProperty({ example: 60, description: 'Số giây cần chờ trước khi yêu cầu OTP mới' })
  resendAfter: number;
}
