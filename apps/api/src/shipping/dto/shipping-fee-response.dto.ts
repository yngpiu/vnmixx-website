import { ApiProperty } from '@nestjs/swagger';

class ShippingServiceDto {
  @ApiProperty({ example: 53320, description: 'ID dịch vụ GHN' })
  serviceId: number;

  @ApiProperty({ example: 'Chuyển phát nhanh', description: 'Tên dịch vụ' })
  shortName: string;

  @ApiProperty({ example: 1, description: 'Loại dịch vụ (1: Nhanh, 2: Chuẩn, 3: Tiết kiệm)' })
  serviceTypeId: number;

  @ApiProperty({ example: 38000, description: 'Tổng phí vận chuyển (VND)' })
  total: number;

  @ApiProperty({ example: 36000, description: 'Phí dịch vụ cơ bản (VND)' })
  serviceFee: number;

  @ApiProperty({ example: 2000, description: 'Phí bảo hiểm (VND)' })
  insuranceFee: number;

  @ApiProperty({
    example: '2026-04-14T00:00:00.000Z',
    description: 'Thời gian giao hàng dự kiến',
    type: String,
  })
  leadtime: string;
}

export class ShippingFeeResponseDto {
  @ApiProperty({ type: [ShippingServiceDto] })
  services: ShippingServiceDto[];
}
