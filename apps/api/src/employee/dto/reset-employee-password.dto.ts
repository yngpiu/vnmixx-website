import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetEmployeePasswordDto {
  @ApiProperty({ description: 'Mật khẩu mới (8-72 ký tự)', minLength: 8, maxLength: 72 })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu mới không được vượt quá 72 ký tự' })
  newPassword: string;
}
