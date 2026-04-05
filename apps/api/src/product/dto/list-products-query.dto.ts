import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListProductsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'basic tee' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'ao' })
  @IsString()
  @IsOptional()
  categorySlug?: string;

  @ApiPropertyOptional({ example: [1, 2], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value.map(Number) : [Number(value)]))
  @IsOptional()
  colorIds?: number[];

  @ApiPropertyOptional({ example: [1, 2], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value.map(Number) : [Number(value)]))
  @IsOptional()
  sizeIds?: number[];

  @ApiPropertyOptional({ example: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ example: 500000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ example: 'newest', enum: ['newest', 'price_asc', 'price_desc'] })
  @IsString()
  @IsIn(['newest', 'price_asc', 'price_desc'])
  @IsOptional()
  sort?: string = 'newest';
}
