import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListProductsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt({ message: 'Giới hạn phải là số nguyên' })
  @Min(1, { message: 'Giới hạn phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Giới hạn không được vượt quá 100' })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'basic tee' })
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'ao' })
  @IsString({ message: 'Slug danh mục phải là chuỗi ký tự' })
  @IsOptional()
  categorySlug?: string;

  @ApiPropertyOptional({ example: [1, 2], type: [Number] })
  @IsArray({ message: 'Danh sách ID màu sắc phải là một mảng' })
  @IsInt({ each: true, message: 'Mỗi ID màu sắc phải là số nguyên' })
  @Transform(({ value }) => (Array.isArray(value) ? value.map(Number) : [Number(value)]))
  @IsOptional()
  colorIds?: number[];

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

  @ApiPropertyOptional({
    example: 'newest',
    enum: ['newest', 'price_asc', 'price_desc', 'best_selling'],
  })
  @IsString({ message: 'Tiêu chí sắp xếp phải là chuỗi ký tự' })
  @IsIn(['newest', 'price_asc', 'price_desc', 'best_selling'], {
    message: 'Tiêu chí sắp xếp không hợp lệ',
  })
  @IsOptional()
  sort?: string = 'newest';
}
