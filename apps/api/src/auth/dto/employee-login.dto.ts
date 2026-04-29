import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO cho đăng nhập nhân viên/dashboard.
 * Chỉ chấp nhận email (không hỗ trợ số điện thoại).
 */
export class EmployeeLoginDto {
  @ApiProperty({
    example: 'employee@example.com',
    description: 'Email tài khoản nhân viên',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
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
