import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 1, description: 'ID địa chỉ giao hàng' })
  @IsInt({ message: 'ID địa chỉ phải là số nguyên' })
  addressId: number;

  @ApiProperty({
    example: 'COD',
    enum: ['COD', 'BANK_TRANSFER'],
    description: 'Phương thức thanh toán',
  })
  @IsEnum(['COD', 'BANK_TRANSFER'] as const, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod: 'COD' | 'BANK_TRANSFER';

  @ApiProperty({ example: 2, description: 'Loại dịch vụ GHN (2: Hàng nhẹ, 5: Hàng nặng)' })
  @IsInt({ message: 'ID loại dịch vụ phải là số nguyên' })
  @Min(1, { message: 'ID loại dịch vụ phải lớn hơn hoặc bằng 1' })
  serviceTypeId: number;

  @ApiProperty({
    example: 'KHONGCHOXEMHANG',
    enum: ['CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG'],
    description: 'Yêu cầu khi giao hàng',
  })
  @IsEnum(['CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG'] as const, {
    message: 'Yêu cầu khi giao hàng không hợp lệ',
  })
  requiredNote: 'CHOTHUHANG' | 'CHOXEMHANGKHONGTHU' | 'KHONGCHOXEMHANG';

  @ApiPropertyOptional({ example: 'Giao giờ hành chính', description: 'Ghi chú đơn hàng' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Ghi chú không được vượt quá 500 ký tự' })
  @IsOptional()
  note?: string;
}
