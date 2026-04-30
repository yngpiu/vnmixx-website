import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * CreateOrderDto: DTO gửi yêu cầu tạo đơn hàng mới.
 * Vai trò: Validate các thông tin cần thiết từ khách hàng khi thực hiện Checkout.
 */
export class CreateOrderDto {
  @ApiProperty({ example: 1, description: 'ID địa chỉ giao hàng' })
  @IsInt({ message: 'ID địa chỉ phải là số nguyên' })
  addressId: number;

  @ApiProperty({
    example: 'COD',
    enum: ['COD', 'BANK_TRANSFER_QR'],
    description: 'Phương thức thanh toán',
  })
  @IsEnum(['COD', 'BANK_TRANSFER_QR'] as const, {
    message: 'Phương thức thanh toán không hợp lệ',
  })
  paymentMethod: 'COD' | 'BANK_TRANSFER_QR';

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
