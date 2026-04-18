import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

const regexPhoneNumber = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;

export class UpdateEmployeeProfileDto {
  @ApiPropertyOptional({ example: 'Trần Thị B', maxLength: 100 })
  @IsOptional()
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', maxLength: 500 })
  @IsOptional()
  @IsUrl({}, { message: 'URL ảnh đại diện không hợp lệ' })
  @MaxLength(500, { message: 'URL ảnh đại diện không được vượt quá 500 ký tự' })
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '+84901234567', maxLength: 20 })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Matches(regexPhoneNumber, { message: 'Số điện thoại không đúng định dạng hợp lệ' })
  @MaxLength(20, { message: 'Số điện thoại không được vượt quá 20 ký tự' })
  phoneNumber?: string;
}
