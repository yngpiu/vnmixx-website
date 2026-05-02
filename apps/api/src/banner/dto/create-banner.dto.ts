import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const BANNER_PLACEMENTS = ['HERO_SLIDER', 'FEATURED_TILE', 'PROMO_STRIP'] as const;

export class CreateBannerDto {
  @ApiProperty({ enum: BANNER_PLACEMENTS, example: 'HERO_SLIDER' })
  @IsEnum(BANNER_PLACEMENTS, { message: 'Loại vị trí banner không hợp lệ' })
  placement: (typeof BANNER_PLACEMENTS)[number];

  @ApiPropertyOptional({ example: 'Holiday Chic Sale', maxLength: 120 })
  @IsString({ message: 'Tiêu đề banner phải là chuỗi ký tự' })
  @MaxLength(120, { message: 'Tiêu đề banner không được vượt quá 120 ký tự' })
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'https://media.vnmixx.shop/banner/cham-he-som.jpg', maxLength: 500 })
  @IsString({ message: 'URL ảnh phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'URL ảnh không được để trống' })
  @MaxLength(500, { message: 'URL ảnh không được vượt quá 500 ký tự' })
  imageUrl: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt({ message: 'ID danh mục phải là số nguyên' })
  @IsNotEmpty({ message: 'ID danh mục không được để trống' })
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
