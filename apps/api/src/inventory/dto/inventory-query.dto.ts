import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class InventoryLowStockQueryDto {
  @ApiPropertyOptional({ example: 20, minimum: 0, maximum: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  @IsOptional()
  threshold?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: false })
  @Type(() => Boolean)
  @IsOptional()
  includeOutOfStock?: boolean;
}

export class InventoryListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'nike' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['in_stock', 'low_stock', 'out_of_stock', 'anomaly'] })
  @IsEnum(['in_stock', 'low_stock', 'out_of_stock', 'anomaly'] as const)
  @IsOptional()
  status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'anomaly';

  @ApiPropertyOptional({
    enum: ['productName', 'sku', 'onHand', 'reserved', 'available', 'updatedAt'],
  })
  @IsEnum(['productName', 'sku', 'onHand', 'reserved', 'available', 'updatedAt'] as const)
  @IsOptional()
  sortBy?: 'productName' | 'sku' | 'onHand' | 'reserved' | 'available' | 'updatedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'] as const)
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class InventoryMovementListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 120 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  variantId?: number;

  @ApiPropertyOptional({ enum: ['IMPORT', 'EXPORT', 'RESERVE', 'RELEASE', 'ADJUSTMENT', 'RETURN'] })
  @IsEnum(['IMPORT', 'EXPORT', 'RESERVE', 'RELEASE', 'ADJUSTMENT', 'RETURN'] as const)
  @IsOptional()
  type?: 'IMPORT' | 'EXPORT' | 'RESERVE' | 'RELEASE' | 'ADJUSTMENT' | 'RETURN';

  @ApiPropertyOptional({ example: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  voucherId?: number;
}

export class InventoryVoucherItemDto {
  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 125000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 'Lô hàng bổ sung đợt 1' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateInventoryVoucherDto {
  @ApiProperty({ example: 'PN20260427-0001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;

  @ApiProperty({ enum: ['IMPORT', 'EXPORT'] })
  @IsEnum(['IMPORT', 'EXPORT'] as const)
  type: 'IMPORT' | 'EXPORT';

  @ApiPropertyOptional({ example: '2026-04-27T10:30:00.000Z' })
  @IsDateString()
  @IsOptional()
  issuedAt?: string;

  @ApiPropertyOptional({ example: 'Phiếu nhập kho đầu ngày' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ type: [InventoryVoucherItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryVoucherItemDto)
  items: InventoryVoucherItemDto[];
}

export class ListInventoryVouchersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ['IMPORT', 'EXPORT'] })
  @IsEnum(['IMPORT', 'EXPORT'] as const)
  @IsOptional()
  type?: 'IMPORT' | 'EXPORT';
}
