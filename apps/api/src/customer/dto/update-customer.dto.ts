import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    enum: ['ACTIVE', 'INACTIVE'],
    example: 'INACTIVE',
    description: 'Trạng thái vận hành do admin quản lý. Không dùng cho trạng thái chờ xác thực.',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'], { message: 'Trạng thái khách hàng phải là ACTIVE hoặc INACTIVE' })
  status?: 'ACTIVE' | 'INACTIVE';
}
