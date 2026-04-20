import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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

const regexPhoneNumber = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;

/**
 * DTO cho yêu cầu đăng ký tài khoản khách hàng mới.
 * Chứa các thông tin cơ bản và thực hiện kiểm tra định dạng dữ liệu (email, số điện thoại, mật khẩu).
 */
export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên', maxLength: 100 })
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  fullName: string;

  @ApiProperty({
    example: 'customer@example.com',
    description: 'Địa chỉ email duy nhất',
    maxLength: 255,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự' })
  email: string;

  @ApiProperty({
    example: '+84901234567',
    description: 'Số điện thoại theo định dạng hợp lệ',
    maxLength: 20,
  })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Matches(regexPhoneNumber, { message: 'Số điện thoại không đúng định dạng hợp lệ' })
  @MaxLength(20, { message: 'Số điện thoại không được vượt quá 20 ký tự' })
  phoneNumber: string;

  @ApiProperty({
    example: 'Str0ngP@ssword!',
    description: 'Mật khẩu (8-72 ký tự)',
    minLength: 8,
    maxLength: 72,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu không được vượt quá 72 ký tự' })
  password: string;

  @ApiPropertyOptional({ example: '1999-12-31', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @IsString({ message: 'Ngày sinh phải là chuỗi ký tự' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày sinh phải theo định dạng YYYY-MM-DD' })
  dob?: string;

  @ApiPropertyOptional({ enum: GenderInput, example: GenderInput.MALE, description: 'Giới tính' })
  @IsOptional()
  @IsEnum(GenderInput, { message: 'Giới tính không hợp lệ' })
  gender?: GenderInput;
}
