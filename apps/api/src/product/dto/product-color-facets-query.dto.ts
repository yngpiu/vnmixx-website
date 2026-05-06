import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Query for contextual color facets on the storefront catalog (excludes colorIds by design).
 */
export class ProductColorFacetsQueryDto {
  @ApiPropertyOptional({ example: 'basic tee' })
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'ao' })
  @IsString({ message: 'Slug danh mục phải là chuỗi ký tự' })
  @IsOptional()
  categorySlug?: string;

  @ApiPropertyOptional({ example: [1, 2], type: [Number] })
  @IsArray({ message: 'Danh sách ID kích thước phải là một mảng' })
  @IsInt({ each: true, message: 'Mỗi ID kích thước phải là số nguyên' })
  @Transform(({ value }) => (Array.isArray(value) ? value.map(Number) : [Number(value)]))
  @IsOptional()
  sizeIds?: number[];

  @ApiPropertyOptional({ example: 100000 })
  @Type(() => Number)
  @IsInt({ message: 'Giá tối thiểu phải là số nguyên' })
  @Min(0, { message: 'Giá tối thiểu không được âm' })
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ example: 500000 })
  @Type(() => Number)
  @IsInt({ message: 'Giá tối đa phải là số nguyên' })
  @Min(0, { message: 'Giá tối đa không được âm' })
  @IsOptional()
  maxPrice?: number;
}
