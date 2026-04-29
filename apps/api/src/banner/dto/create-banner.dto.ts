import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBannerDto {
  @ApiProperty({ example: 'https://media.vnmixx.shop/banner/cham-he-som.jpg', maxLength: 500 })
  @IsString({ message: 'URL ảnh phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'URL ảnh không được để trống' })
  @MaxLength(500, { message: 'URL ảnh không được vượt quá 500 ký tự' })
  imageUrl: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt({ message: 'ID danh mục phải là số nguyên' })
  @Min(1, { message: 'ID danh mục phải lớn hơn hoặc bằng 1' })
  categoryId: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0' })
  @IsOptional()
  sortOrder?: number;
}
