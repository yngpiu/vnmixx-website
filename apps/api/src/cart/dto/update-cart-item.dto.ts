import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

// DTO dùng để cập nhật số lượng của một sản phẩm hiện có trong giỏ hàng.
export class UpdateCartItemDto {
  @ApiProperty({ example: 2, description: 'Số lượng mới', minimum: 1 })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' })
  quantity: number;
}
