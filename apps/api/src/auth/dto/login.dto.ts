import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/** DTO for both customer and employee login. */
export class LoginDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Địa chỉ email đã đăng ký',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Str0ngP@ssword!',
    description: 'Mật khẩu tài khoản (tối thiểu 8 ký tự)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
