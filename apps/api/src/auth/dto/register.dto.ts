import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

enum GenderInput {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

/** DTO for customer registration. Employees are created by admins. */
export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    example: 'customer@example.com',
    description: 'Địa chỉ email duy nhất',
    maxLength: 255,
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: '+84901234567',
    description: 'Số điện thoại theo định dạng hợp lệ',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+\-\s()]+$/, { message: 'số điện thoại không đúng định dạng hợp lệ' })
  @MaxLength(20)
  phoneNumber: string;

  @ApiProperty({
    example: 'Str0ngP@ssword!',
    description: 'Mật khẩu (8-72 ký tự)',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiPropertyOptional({ example: '1999-12-31', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'ngày sinh phải theo định dạng YYYY-MM-DD' })
  dob?: string;

  @ApiPropertyOptional({ enum: GenderInput, example: GenderInput.MALE, description: 'Giới tính' })
  @IsOptional()
  @IsEnum(GenderInput)
  gender?: GenderInput;
}
