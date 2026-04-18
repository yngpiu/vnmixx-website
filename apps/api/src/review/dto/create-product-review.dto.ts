import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateProductReviewDto {
  @ApiProperty({ description: 'Điểm đánh giá từ 1 đến 5.', example: 5 })
  @IsInt({ message: 'rating phải là số nguyên.' })
  @Min(1, { message: 'rating tối thiểu là 1.' })
  @Max(5, { message: 'rating tối đa là 5.' })
  rating!: number;
  @ApiPropertyOptional({ example: 'Sản phẩm tốt' })
  @IsOptional()
  @IsString({ message: 'title phải là chuỗi.' })
  @MaxLength(120, { message: 'title tối đa 120 ký tự.' })
  title?: string;
  @ApiPropertyOptional({ example: 'Nhận hàng nhanh, chất lượng ổn.' })
  @IsOptional()
  @IsString({ message: 'content phải là chuỗi.' })
  @MaxLength(1000, { message: 'content tối đa 1000 ký tự.' })
  content?: string;
}
