import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
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
  @IsInt({ message: 'ID màu sắc phải là số nguyên' })
  @Min(1, { message: 'ID màu sắc phải lớn hơn hoặc bằng 1' })
  colorId: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'ID kích thước phải là số nguyên' })
  @Min(1, { message: 'ID kích thước phải lớn hơn hoặc bằng 1' })
  sizeId: number;

  @ApiProperty({ example: 'BT-WHITE-S', maxLength: 50 })
  @IsString({ message: 'SKU phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'SKU không được để trống' })
  @MaxLength(50, { message: 'SKU không được vượt quá 50 ký tự' })
  sku: string;

  @ApiProperty({ example: 299000 })
  @IsInt({ message: 'Giá phải là số nguyên' })
  @Min(0, { message: 'Giá không được âm' })
  price: number;

  @ApiProperty({ example: 50, description: 'Tồn kho thực tế ban đầu' })
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Số lượng tồn kho không được âm' })
  onHand: number;
}

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
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

// CreateProductDto: DTO chính để tạo một sản phẩm mới hoàn chỉnh.
// Hỗ trợ tạo đồng thời thông tin cơ bản, danh sách biến thể, hình ảnh và gán danh mục.
export class CreateProductDto {
  @ApiProperty({ example: 'Áo Basic Tee', maxLength: 255 })
  @IsString({ message: 'Tên sản phẩm phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @MaxLength(255, { message: 'Tên sản phẩm không được vượt quá 255 ký tự' })
  name: string;

  @ApiProperty({ example: 'ao-basic-tee', maxLength: 255 })
  @IsString({ message: 'Slug phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Slug không được để trống' })
  @MaxLength(255, { message: 'Slug không được vượt quá 255 ký tự' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ được chứa chữ thường, số và dấu gạch nối',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'Áo thun basic chất cotton...', nullable: true })
  @IsString({ message: 'Mô tả sản phẩm phải là chuỗi ký tự' })
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 300, description: 'Cân nặng sản phẩm (gram)' })
  @IsInt({ message: 'Cân nặng phải là số nguyên' })
  @Min(1, { message: 'Cân nặng phải lớn hơn hoặc bằng 1' })
  weight: number;

  @ApiProperty({ example: 30, description: 'Chiều dài sản phẩm (cm)' })
  @IsInt({ message: 'Chiều dài phải là số nguyên' })
  @Min(1, { message: 'Chiều dài phải lớn hơn hoặc bằng 1' })
  length: number;

  @ApiProperty({ example: 25, description: 'Chiều rộng sản phẩm (cm)' })
  @IsInt({ message: 'Chiều rộng phải là số nguyên' })
  @Min(1, { message: 'Chiều rộng phải lớn hơn hoặc bằng 1' })
  width: number;

  @ApiProperty({ example: 5, description: 'Chiều cao sản phẩm (cm)' })
  @IsInt({ message: 'Chiều cao phải là số nguyên' })
  @Min(1, { message: 'Chiều cao phải lớn hơn hoặc bằng 1' })
  height: number;

  @ApiPropertyOptional({
    example: [3, 12],
    type: [Number],
    description: 'Nhiều danh mục (thường là các lá) được gán cho sản phẩm.',
  })
  @IsArray({ message: 'Danh sách ID danh mục phải là một mảng' })
  @ArrayMaxSize(40, { message: 'Không được gán quá 40 danh mục' })
  @IsInt({ each: true, message: 'Mỗi ID danh mục phải số nguyên' })
  @Min(1, { each: true, message: 'Mỗi ID danh mục phải lớn hơn hoặc bằng 1' })
  @ArrayUnique({ message: 'Các ID danh mục không được trùng lặp' })
  @IsOptional()
  categoryIds?: number[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    type: [CreateProductVariantDto],
    example: [
      {
        colorId: 1,
        sizeId: 1,
        sku: 'BT-WHITE-S',
        price: 299000,
        onHand: 50,
      },
    ],
  })
  @IsArray({ message: 'Danh sách biến thể phải là một mảng' })
  @ArrayMinSize(1, { message: 'Phải có ít nhất một biến thể' })
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];

  @ApiPropertyOptional({
    type: [CreateProductImageDto],
    example: [
      {
        url: 'https://example.com/image.jpg',
        colorId: 1,
        altText: 'Trắng - mặt trước',
        sortOrder: 0,
      },
    ],
  })
  @IsArray({ message: 'Danh sách hình ảnh phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  @IsOptional()
  images?: CreateProductImageDto[];
}
