import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '0901234567', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 1, description: 'City ID' })
  @IsInt()
  @IsOptional()
  cityId?: number;

  @ApiPropertyOptional({ example: 1, description: 'District ID (must belong to city)' })
  @IsInt()
  @IsOptional()
  districtId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Ward ID (must belong to district)' })
  @IsInt()
  @IsOptional()
  wardId?: number;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(255)
  addressLine?: string;

  @ApiPropertyOptional({ enum: ['HOME', 'OFFICE'] })
  @IsEnum(['HOME', 'OFFICE'] as const)
  @IsOptional()
  type?: 'HOME' | 'OFFICE';
}
