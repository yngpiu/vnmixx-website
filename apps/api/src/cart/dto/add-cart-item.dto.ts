import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 1, description: 'ID biến thể sản phẩm' })
  @IsInt()
  variantId: number;

  @ApiProperty({ example: 1, description: 'Số lượng', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
