import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

/**
 * DTO để xác thực mã OTP khi khách hàng đăng ký tài khoản.
 */
export class VerifyCustomerOtpDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email khách hàng dùng trong lúc đăng ký',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số được gửi qua email' })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @Matches(/^\d{6}$/, { message: 'OTP phải là mã số gồm 6 chữ số' })
  otp: string;
}

/**
 * DTO để yêu cầu gửi lại mã OTP xác thực tài khoản.
 */
export class ResendCustomerOtpDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email khách hàng đang chờ xác thực',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}

/**
 * DTO phản hồi sau khi khách hàng đăng ký thành công và đang chờ xác thực OTP.
 */
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
