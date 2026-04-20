import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * UpdateCartItemDto: DTO cập nhật số lượng sản phẩm trong giỏ.
 * Vai trò: Validate dữ liệu số lượng mới khi khách hàng thay đổi số lượng của một mục trong giỏ hàng.
 */
export class UpdateCartItemDto {
  @ApiProperty({ example: 2, description: 'Số lượng mới', minimum: 1 })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' })
  quantity: number;
}
