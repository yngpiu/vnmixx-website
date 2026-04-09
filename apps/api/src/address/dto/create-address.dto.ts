import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: '0901234567', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phoneNumber: string;

  @ApiProperty({ example: 1, description: 'ID tỉnh/thành phố' })
  @IsInt()
  cityId: number;

  @ApiProperty({ example: 1, description: 'ID quận/huyện (phải thuộc tỉnh/thành phố)' })
  @IsInt()
  districtId: number;

  @ApiProperty({ example: 1, description: 'ID phường/xã (phải thuộc quận/huyện)' })
  @IsInt()
  wardId: number;

  @ApiProperty({ example: '123 Nguyễn Huệ', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine: string;

  @ApiPropertyOptional({ enum: ['HOME', 'OFFICE'], default: 'HOME' })
  @IsEnum(['HOME', 'OFFICE'] as const)
  @IsOptional()
  type?: 'HOME' | 'OFFICE';

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
