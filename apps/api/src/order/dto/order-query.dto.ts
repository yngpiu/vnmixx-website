import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * ListMyOrdersQueryDto: DTO chứa các tham số truy vấn danh sách đơn hàng của khách hàng.
 */
export class ListMyOrdersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt({ message: 'Giới hạn phải là số nguyên' })
  @Min(1, { message: 'Giới hạn phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Giới hạn không được vượt quá 100' })
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
  @IsEnum(
    [
      'PENDING',
      'PROCESSING',
      'AWAITING_SHIPMENT',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
    ] as const,
    { message: 'Trạng thái đơn hàng không hợp lệ' },
  )
  @IsOptional()
  status?: string;
}

/**
 * ListAdminOrdersQueryDto: DTO chứa các tham số truy vấn danh sách đơn hàng phục vụ quản trị.
 * Hỗ trợ lọc theo trạng thái đơn, trạng thái thanh toán, từ khóa tìm kiếm và ID khách hàng.
 */
export class ListAdminOrdersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt({ message: 'Giới hạn phải là số nguyên' })
  @Min(1, { message: 'Giới hạn phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Giới hạn không được vượt quá 100' })
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
  @IsEnum(
    [
      'PENDING',
      'PROCESSING',
      'AWAITING_SHIPMENT',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
    ] as const,
    { message: 'Trạng thái đơn hàng không hợp lệ' },
  )
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    example: 'PENDING',
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
  })
  @IsEnum(['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] as const, {
    message: 'Trạng thái thanh toán không hợp lệ',
  })
  @IsOptional()
  paymentStatus?: string;

  @ApiPropertyOptional({
    example: 'VNM260410',
    description: 'Tìm theo mã đơn, tên, SĐT, mã vận đơn GHN',
  })
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'Lọc đơn hàng theo khách hàng.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'customerId phải là số nguyên.' })
  @Min(1, { message: 'customerId phải lớn hơn hoặc bằng 1.' })
  @IsOptional()
  customerId?: number;
}
