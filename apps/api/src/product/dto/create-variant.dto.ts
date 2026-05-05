import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// CreateVariantDto: DTO dùng để thêm một biến thể mới vào sản phẩm đã tồn tại.
// Đảm bảo các ràng buộc về SKU duy nhất và tổ hợp thuộc tính (Màu/Size) không trùng lặp.
export class CreateVariantDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'ID màu sắc phải là số nguyên' })
  @Min(1, { message: 'ID màu sắc phải lớn hơn hoặc bằng 1' })
  colorId: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'ID kích thước phải là số nguyên' })
  @Min(1, { message: 'ID kích thước phải lớn hơn hoặc bằng 1' })
  sizeId: number;

  @ApiProperty({ example: 'BT-WHITE-L', maxLength: 50 })
  @IsString({ message: 'SKU phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'SKU không được để trống' })
  @MaxLength(50, { message: 'SKU không được vượt quá 50 ký tự' })
  sku: string;

  @ApiProperty({ example: 299000 })
  @IsInt({ message: 'Giá phải là số nguyên' })
  @Min(0, { message: 'Giá không được âm' })
  price: number;

  @ApiProperty({ example: 499000, required: false, nullable: true })
  @IsInt({ message: 'Giá niêm yết phải là số nguyên' })
  @Min(0, { message: 'Giá niêm yết không được âm' })
  @IsOptional()
  compareAtPrice?: number;

  @ApiProperty({ example: 50, description: 'Tồn kho thực tế ban đầu' })
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Số lượng tồn kho không được âm' })
  onHand: number;
}
