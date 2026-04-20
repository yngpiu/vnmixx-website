import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * ConfirmOrderShipmentDto: DTO dùng cho nhân viên khi xác nhận đơn hàng.
 * Vai trò: Tiếp nhận thông tin vật lý thực tế của kiện hàng để tính toán vận đơn chính xác.
 */
export class ConfirmOrderShipmentDto {
  @ApiProperty({ example: 1200, description: 'Khối lượng kiện hàng (gram)' })
  @IsInt({ message: 'Khối lượng kiện hàng phải là số nguyên' })
  @Min(1, { message: 'Khối lượng kiện hàng phải lớn hơn hoặc bằng 1g' })
  weight: number;

  @ApiProperty({ example: 40, description: 'Chiều dài kiện hàng (cm)' })
  @IsInt({ message: 'Chiều dài kiện hàng phải là số nguyên' })
  @Min(1, { message: 'Chiều dài kiện hàng phải lớn hơn hoặc bằng 1cm' })
  length: number;

  @ApiProperty({ example: 30, description: 'Chiều rộng kiện hàng (cm)' })
  @IsInt({ message: 'Chiều rộng kiện hàng phải là số nguyên' })
  @Min(1, { message: 'Chiều rộng kiện hàng phải lớn hơn hoặc bằng 1cm' })
  width: number;

  @ApiProperty({ example: 20, description: 'Chiều cao kiện hàng (cm)' })
  @IsInt({ message: 'Chiều cao kiện hàng phải là số nguyên' })
  @Min(1, { message: 'Chiều cao kiện hàng phải lớn hơn hoặc bằng 1cm' })
  height: number;
}
