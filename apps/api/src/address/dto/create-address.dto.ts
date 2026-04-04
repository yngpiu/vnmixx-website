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

  @ApiProperty({ example: 1, description: 'City ID' })
  @IsInt()
  cityId: number;

  @ApiProperty({ example: 1, description: 'District ID (must belong to city)' })
  @IsInt()
  districtId: number;

  @ApiProperty({ example: 1, description: 'Ward ID (must belong to district)' })
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
