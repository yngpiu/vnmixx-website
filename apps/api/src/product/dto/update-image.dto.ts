import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateImageDto {
  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  colorId?: number | null;

  @ApiPropertyOptional({ example: 'Trắng - mặt trước', maxLength: 255, nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  altText?: string | null;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
