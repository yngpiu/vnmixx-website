import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * AddCartItemDto: DTO thêm sản phẩm vào giỏ.
 * Vai trò: Validate dữ liệu ID biến thể và số lượng khi khách hàng muốn thêm sản phẩm vào giỏ hàng.
 */
export class AddCartItemDto {
  @ApiProperty({ example: 1, description: 'ID biến thể sản phẩm' })
  @IsInt({ message: 'ID biến thể phải là số nguyên' })
  variantId: number;

  @ApiProperty({ example: 1, description: 'Số lượng', minimum: 1 })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' })
  quantity: number;
}
