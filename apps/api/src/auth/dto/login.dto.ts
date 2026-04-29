import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

const phoneRegex = /^(\+?84[35879]\d{8}|0[35879]\d{8})$/;

function isPhoneNumber(value: string): boolean {
  return phoneRegex.test(value);
}

/**
 * DTO cho yêu cầu đăng nhập.
 * Dùng chung cho cả khách hàng (Customer) và nhân viên (Employee).
 * Với Customer, trường `email` có thể chứa `email` hoặc `phoneNumber`.
 */
export class LoginDto {
  @ApiProperty({
    example: '0901234567',
    description: 'Email hoặc số điện thoại đã đăng ký',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .trim()
          .replace(/[\s-().]/g, '')
          .toLowerCase()
      : value,
  )
  @IsNotEmpty({ message: 'Email hoặc số điện thoại không được để trống' })
  @ValidateIf((_object: unknown, value: string) => !isPhoneNumber(value))
  @IsEmail({}, { message: 'Email hoặc số điện thoại không đúng định dạng' })
  @ValidateIf((_object: unknown, value: string) => isPhoneNumber(value))
  @Matches(phoneRegex, { message: 'Email hoặc số điện thoại không đúng định dạng' })
  email: string;

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
