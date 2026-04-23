import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Áo Basic Tee V2', maxLength: 255 })
  @IsString({ message: 'Tên sản phẩm phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(255, { message: 'Tên sản phẩm không được vượt quá 255 ký tự' })
  name?: string;

  @ApiPropertyOptional({ example: 'ao-basic-tee-v2', maxLength: 255 })
  @IsString({ message: 'Slug phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(255, { message: 'Slug không được vượt quá 255 ký tự' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ được chứa chữ thường, số và dấu gạch nối',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Áo thun basic chất cotton...', nullable: true })
  @IsString({ message: 'Mô tả sản phẩm phải là chuỗi ký tự' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumb.jpg', nullable: true })
  @IsString({ message: 'URL ảnh đại diện phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(500, { message: 'URL ảnh đại diện không được vượt quá 500 ký tự' })
  thumbnail?: string;

  @ApiPropertyOptional({ example: [3, 12], type: [Number] })
  @IsArray({ message: 'Danh sách ID danh mục phải là một mảng' })
  @ArrayMaxSize(40, { message: 'Không được gán quá 40 danh mục' })
  @IsInt({ each: true, message: 'Mỗi ID danh mục phải là số nguyên' })
  @Min(1, { each: true, message: 'Mỗi ID danh mục phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  categoryIds?: number[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsOptional()
  isActive?: boolean;
}
