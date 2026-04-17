import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateImageDto {
  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsInt({ message: 'ID màu sắc phải là số nguyên' })
  @Min(1, { message: 'ID màu sắc phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  colorId?: number | null;

  @ApiPropertyOptional({ example: 'Trắng - mặt trước', maxLength: 255, nullable: true })
  @IsString({ message: 'Mô tả ảnh phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(255, { message: 'Mô tả ảnh không được vượt quá 255 ký tự' })
  altText?: string | null;

  @ApiPropertyOptional({ example: 0 })
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0' })
  @IsOptional()
  sortOrder?: number;
}
