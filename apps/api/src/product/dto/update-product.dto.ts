import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Áo Basic Tee V2', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'ao-basic-tee-v2', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug chỉ được chứa chữ thường, số và dấu gạch nối',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Áo thun basic...', nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumb.jpg', nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  thumbnail?: string;

  @ApiPropertyOptional({ example: 3, nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
