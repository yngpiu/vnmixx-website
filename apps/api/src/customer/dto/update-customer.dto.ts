import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: true, description: 'Kích hoạt hoặc vô hiệu hóa khách hàng' })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  isActive?: boolean;
}
