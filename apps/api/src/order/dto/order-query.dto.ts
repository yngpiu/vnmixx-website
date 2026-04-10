import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListMyOrdersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'PENDING',
    enum: [
      'PENDING',
      'PROCESSING',
      'AWAITING_SHIPMENT',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
    ],
  })
  @IsEnum([
    'PENDING',
    'PROCESSING',
    'AWAITING_SHIPMENT',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
  ] as const)
  @IsOptional()
  status?: string;
}

export class ListAdminOrdersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'PENDING',
    enum: [
      'PENDING',
      'PROCESSING',
      'AWAITING_SHIPMENT',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
    ],
  })
  @IsEnum([
    'PENDING',
    'PROCESSING',
    'AWAITING_SHIPMENT',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
  ] as const)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    example: 'PENDING',
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
  })
  @IsEnum(['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] as const)
  @IsOptional()
  paymentStatus?: string;

  @ApiPropertyOptional({
    example: 'VNM260410',
    description: 'Tìm theo mã đơn, tên, SĐT, mã vận đơn GHN',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
