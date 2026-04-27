import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * CreateProductReviewDto: DTO gửi yêu cầu đánh giá sản phẩm từ khách hàng.
 * Vai trò: Validate điểm đánh giá (1-5 sao) và nội dung đánh giá.
 */
export class CreateProductReviewDto {
  @ApiProperty({
    description: 'ID dòng sản phẩm trong đơn hàng đã mua để review theo từng variant.',
    example: 1201,
  })
  @IsInt({ message: 'orderItemId phải là số nguyên.' })
  @Min(1, { message: 'orderItemId tối thiểu là 1.' })
  orderItemId!: number;

  @ApiProperty({ description: 'Điểm đánh giá từ 1 đến 5.', example: 5 })
  @IsInt({ message: 'rating phải là số nguyên.' })
  @Min(1, { message: 'rating tối thiểu là 1.' })
  @Max(5, { message: 'rating tối đa là 5.' })
  rating!: number;

  @ApiPropertyOptional({ example: 'Nhận hàng nhanh, chất lượng ổn.' })
  @IsOptional()
  @IsString({ message: 'content phải là chuỗi.' })
  @MaxLength(1000, { message: 'content tối đa 1000 ký tự.' })
  content?: string;
}
