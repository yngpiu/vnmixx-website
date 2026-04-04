import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Áo sơ mi', description: 'Category name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'ao-so-mi',
    description: 'URL-friendly slug (lowercase, hyphens only)',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric and hyphens only',
  })
  slug: string;

  @ApiPropertyOptional({ example: false, description: 'Whether this category is featured' })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Display sort order', minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Parent category ID (max 3 levels deep)',
    minimum: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  parentId?: number;
}
