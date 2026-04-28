import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
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

export class UpsertProductVariantDto {
  @ApiPropertyOptional({ example: 101 })
  @IsInt({ message: 'ID biến thể phải là số nguyên' })
  @Min(1, { message: 'ID biến thể phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt({ message: 'ID màu sắc phải là số nguyên' })
  @Min(1, { message: 'ID màu sắc phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  colorId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt({ message: 'ID kích thước phải là số nguyên' })
  @Min(1, { message: 'ID kích thước phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  sizeId?: number;

  @ApiPropertyOptional({ example: 'BT-WHITE-L', maxLength: 50 })
  @IsString({ message: 'SKU phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'SKU không được để trống' })
  @MaxLength(50, { message: 'SKU không được vượt quá 50 ký tự' })
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 299000 })
  @IsInt({ message: 'Giá phải là số nguyên' })
  @Min(0, { message: 'Giá không được âm' })
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 50, description: 'Cập nhật tồn kho thực tế (on hand)' })
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Số lượng tồn kho không được âm' })
  @IsOptional()
  onHand?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsOptional()
  isActive?: boolean;
}

export class UpsertProductImageDto {
  @ApiPropertyOptional({ example: 101 })
  @IsInt({ message: 'ID hình ảnh phải là số nguyên' })
  @Min(1, { message: 'ID hình ảnh phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  id?: number;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg', maxLength: 500 })
  @IsString({ message: 'URL hình ảnh phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'URL hình ảnh không được để trống' })
  @MaxLength(500, { message: 'URL hình ảnh không được vượt quá 500 ký tự' })
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsInt({ message: 'ID màu sắc phải là số nguyên' })
  @Min(1, { message: 'ID màu sắc phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  colorId?: number | null;

  @ApiPropertyOptional({ example: 'Trắng - mặt trước', maxLength: 255, nullable: true })
  @IsString({ message: 'Mô tả ảnh phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Mô tả ảnh không được vượt quá 255 ký tự' })
  @IsOptional()
  altText?: string | null;

  @ApiPropertyOptional({ example: 0 })
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0' })
  @IsOptional()
  sortOrder?: number;
}

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
  @ArrayUnique({ message: 'Các ID danh mục không được trùng lặp' })
  @IsOptional()
  categoryIds?: number[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [UpsertProductVariantDto],
    description:
      'Upsert biến thể: có id thì cập nhật, không có id thì tạo mới. Mục không gửi lên sẽ giữ nguyên.',
  })
  @IsArray({ message: 'Danh sách biến thể phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => UpsertProductVariantDto)
  @IsOptional()
  variants?: UpsertProductVariantDto[];

  @ApiPropertyOptional({
    type: [UpsertProductImageDto],
    description:
      'Upsert hình ảnh: có id thì cập nhật, không có id thì tạo mới. Mục không gửi lên sẽ giữ nguyên.',
  })
  @IsArray({ message: 'Danh sách hình ảnh phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => UpsertProductImageDto)
  @IsOptional()
  images?: UpsertProductImageDto[];
}
