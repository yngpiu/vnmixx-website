/**
 * DTO yêu cầu cập nhật hồ sơ Khách hàng.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

enum GenderInput {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A', maxLength: 100 })
  @IsOptional()
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  fullName?: string;

  @ApiPropertyOptional({ example: '1999-12-31', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @IsString({ message: 'Ngày sinh phải là chuỗi ký tự' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày sinh phải theo định dạng YYYY-MM-DD' })
  dob?: string;

  @ApiPropertyOptional({ enum: GenderInput, example: GenderInput.MALE })
  @IsOptional()
  @IsEnum(GenderInput, { message: 'Giới tính không hợp lệ' })
  gender?: GenderInput;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', maxLength: 500 })
  @IsOptional()
  @IsUrl({}, { message: 'URL ảnh đại diện không hợp lệ' })
  @MaxLength(500, { message: 'URL ảnh đại diện không được vượt quá 500 ký tự' })
  avatarUrl?: string;
}
