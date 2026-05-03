import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const regexPhoneNumber = /^(03[2-9]|05[6|8|9]|07[0|6-9]|08[1-9]|09[0-9])[0-9]{7}$/;

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A', maxLength: 100 })
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsOptional()
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  fullName?: string;

  @ApiPropertyOptional({ example: '0901234567', maxLength: 20 })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Matches(regexPhoneNumber, { message: 'Số điện thoại không đúng định dạng hợp lệ' })
  @IsOptional()
  @MaxLength(20, { message: 'Số điện thoại không được vượt quá 20 ký tự' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID tỉnh/thành phố' })
  @IsInt({ message: 'ID tỉnh/thành phố phải là số nguyên' })
  @IsOptional()
  cityId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID quận/huyện (phải thuộc tỉnh/thành phố)' })
  @IsInt({ message: 'ID quận/huyện phải là số nguyên' })
  @IsOptional()
  districtId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID phường/xã (phải thuộc quận/huyện)' })
  @IsInt({ message: 'ID phường/xã phải là số nguyên' })
  @IsOptional()
  wardId?: number;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ', maxLength: 255 })
  @IsString({ message: 'Địa chỉ chi tiết phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Địa chỉ chi tiết không được để trống' })
  @IsOptional()
  @MaxLength(255, { message: 'Địa chỉ chi tiết không được vượt quá 255 ký tự' })
  addressLine?: string;

  @ApiPropertyOptional({ enum: ['HOME', 'OFFICE'] })
  @IsEnum(['HOME', 'OFFICE'] as const, { message: 'Loại địa chỉ không hợp lệ' })
  @IsOptional()
  type?: 'HOME' | 'OFFICE';

  @ApiPropertyOptional({ example: false })
  @IsBoolean({ message: 'Trạng thái mặc định phải là kiểu boolean' })
  @IsOptional()
  isDefault?: boolean;
}
