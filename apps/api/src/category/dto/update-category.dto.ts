import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Áo sơ mi', description: 'Category name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'ao-so-mi',
    description: 'URL-friendly slug (lowercase, hyphens only)',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric and hyphens only',
  })
  slug?: string;

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
    description: 'Parent category ID (null to move to root, minimum: 1)',
    nullable: true,
    minimum: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  parentId?: number | null;
}
