import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateProductVariantDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  colorId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  sizeId: number;

  @ApiProperty({ example: 'BT-WHITE-S', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ example: 299000 })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50, description: 'Tồn kho thực tế ban đầu' })
  @IsInt()
  @Min(0)
  onHand: number;
}

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  url: string;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  colorId?: number;

  @ApiPropertyOptional({ example: 'Trắng - mặt trước', maxLength: 255, nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Áo Basic Tee', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'ao-basic-tee', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug chỉ được chứa chữ thường, số và dấu gạch nối',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'Áo thun basic chất cotton...', nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumb.jpg', nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  thumbnail?: string;

  @ApiPropertyOptional({ example: 3, nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  /** @deprecated Dùng `categoryIds` để gán nhiều danh mục; nếu chỉ gửi một id có thể dùng trường này. */
  categoryId?: number;

  @ApiPropertyOptional({
    example: [3, 12],
    type: [Number],
    description:
      'Nhiều danh mục (thường là các lá). Trùng với `categoryId` đơn lẻ thì ưu tiên mảng này.',
  })
  @IsArray()
  @ArrayMaxSize(40)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  categoryIds?: number[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ type: [CreateProductVariantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];

  @ApiPropertyOptional({ type: [CreateProductImageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  @IsOptional()
  images?: CreateProductImageDto[];
}
