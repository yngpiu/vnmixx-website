import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * CreateImageDto: DTO dùng để thêm một hình ảnh mới vào sản phẩm đã tồn tại.
 */
export class CreateImageDto {
  @ApiProperty({ example: 'https://example.com/image.jpg', maxLength: 500 })
  @IsString({ message: 'URL hình ảnh phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'URL hình ảnh không được để trống' })
  @MaxLength(500, { message: 'URL hình ảnh không được vượt quá 500 ký tự' })
  url: string;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsInt({ message: 'ID màu sắc phải là số nguyên' })
  @Min(1, { message: 'ID màu sắc phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  colorId?: number;

  @ApiPropertyOptional({ example: 'Trắng - mặt trước', maxLength: 255, nullable: true })
  @IsString({ message: 'Mô tả ảnh phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(255, { message: 'Mô tả ảnh không được vượt quá 255 ký tự' })
  altText?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0' })
  @IsOptional()
  sortOrder?: number;
}
