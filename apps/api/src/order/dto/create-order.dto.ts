import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 1, description: 'ID địa chỉ giao hàng' })
  @IsInt()
  addressId: number;

  @ApiProperty({
    example: 'COD',
    enum: ['COD', 'BANK_TRANSFER'],
    description: 'Phương thức thanh toán',
  })
  @IsEnum(['COD', 'BANK_TRANSFER'] as const)
  paymentMethod: 'COD' | 'BANK_TRANSFER';

  @ApiProperty({ example: 2, description: 'Loại dịch vụ GHN (2: Hàng nhẹ, 5: Hàng nặng)' })
  @IsInt()
  @Min(1)
  serviceTypeId: number;

  @ApiProperty({
    example: 'KHONGCHOXEMHANG',
    enum: ['CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG'],
    description: 'Yêu cầu khi giao hàng',
  })
  @IsEnum(['CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG'] as const)
  requiredNote: 'CHOTHUHANG' | 'CHOXEMHANGKHONGTHU' | 'KHONGCHOXEMHANG';

  @ApiPropertyOptional({ example: 'Giao giờ hành chính', description: 'Ghi chú đơn hàng' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;
}
