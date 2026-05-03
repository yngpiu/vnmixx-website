import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

const phoneRegex = /^(03[2-9]|05[6|8|9]|07[0|6-9]|08[1-9]|09[0-9])[0-9]{7}$/;

function isPhoneNumber(value: string): boolean {
  return phoneRegex.test(value);
}

/**
 * DTO cho đăng nhập khách hàng (shop).
 * Trường `emailOrPhone` có thể chứa `email` hoặc `phoneNumber`.
 */
export class LoginDto {
  @ApiProperty({
    example: '0901234567',
    description: 'Email hoặc số điện thoại đã đăng ký',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmedValue = value.trim();
    if (trimmedValue.includes('@')) {
      return trimmedValue.toLowerCase();
    }
    return trimmedValue;
  })
  @IsNotEmpty({ message: 'Email hoặc số điện thoại không được để trống' })
  @ValidateIf((_object: unknown, value: string) => !isPhoneNumber(value))
  @IsEmail({}, { message: 'Email hoặc số điện thoại không đúng định dạng' })
  @ValidateIf((_object: unknown, value: string) => isPhoneNumber(value))
  @Matches(phoneRegex, { message: 'Email hoặc số điện thoại không đúng định dạng' })
  emailOrPhone: string;

  @ApiProperty({
    example: 'Str0ngP@ssword!',
    description: 'Mật khẩu tài khoản (tối thiểu 8 ký tự)',
    minLength: 8,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;
}
