import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * CreateCustomerReviewDto: DTO tạo đánh giá sản phẩm từ khách hàng.
 */
export class CreateCustomerReviewDto {
  @ApiProperty({
    description: 'ID sản phẩm cần đánh giá.',
    example: 45,
    minimum: 1,
  })
  @IsInt({ message: 'productId phải là số nguyên.' })
  @Min(1, { message: 'productId phải lớn hơn hoặc bằng 1.' })
  productId!: number;

  @ApiPropertyOptional({
    description: 'ID order item (dòng sản phẩm trong đơn hàng).',
    example: 123,
  })
  @IsOptional()
  @IsInt({ message: 'orderItemId phải là số nguyên.' })
  @Min(1, { message: 'orderItemId phải lớn hơn hoặc bằng 1.' })
  orderItemId?: number;

  @ApiProperty({
    description: 'Số sao đánh giá (1-5).',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt({ message: 'rating phải là số nguyên.' })
  @Min(1, { message: 'rating phải từ 1 đến 5.' })
  @Max(5, { message: 'rating phải từ 1 đến 5.' })
  rating!: number;

  @ApiPropertyOptional({
    description: 'Tiêu đề đánh giá.',
    example: 'Sản phẩm rất đẹp',
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'title phải là chuỗi.' })
  @MaxLength(120, { message: 'title tối đa 120 ký tự.' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Nội dung đánh giá.',
    example: 'Đóng gói cẩn thận, giao nhanh.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'content phải là chuỗi.' })
  @MaxLength(1000, { message: 'content tối đa 1000 ký tự.' })
  content?: string;
}
