import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const regexPhoneNumber = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Trần Thị B', maxLength: 100 })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  fullName: string;

  @ApiProperty({ example: 'employee@example.com', maxLength: 255 })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng' })
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự' })
  email: string;

  @ApiProperty({ example: '+84901234567', maxLength: 20 })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Matches(regexPhoneNumber, { message: 'Số điện thoại không đúng định dạng hợp lệ' })
  @MaxLength(20, { message: 'Số điện thoại không được vượt quá 20 ký tự' })
  phoneNumber: string;

  @ApiProperty({ example: 'StrongP@ss1', minLength: 8 })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;

  @ApiPropertyOptional({
    example: [1, 2],
    description: 'ID các vai trò gán cho nhân viên sau khi tạo',
    type: [Number],
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách vai trò phải là một mảng' })
  @ArrayUnique({ message: 'Các vai trò không được trùng lặp' })
  @IsInt({ each: true, message: 'Mỗi ID vai trò phải là số nguyên' })
  @Min(1, { each: true, message: 'Mỗi ID vai trò phải lớn hơn hoặc bằng 1' })
  roleIds?: number[];
}
