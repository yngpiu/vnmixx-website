import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CalculateShippingFeeDto {
  @ApiProperty({ description: 'ID địa chỉ nhận hàng (trong hệ thống)', example: 1 })
  @IsInt()
  addressId: number;
}
