import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Pagination ──────────────────────────────────────────

class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 8 })
  totalPages: number;
}

// ─── Nested DTOs ─────────────────────────────────────────

class OrderItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Basic Tee' })
  productName: string;

  @ApiProperty({ example: 'Đen' })
  colorName: string;

  @ApiProperty({ example: 'M' })
  sizeLabel: string;

  @ApiProperty({ example: 'BT-BLACK-M' })
  sku: string;

  @ApiProperty({ example: 249000 })
  price: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 498000 })
  subtotal: number;
}

class PaymentDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'COD', enum: ['COD', 'BANK_TRANSFER'] })
  method: string;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] })
  status: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  transactionId: string | null;

  @ApiProperty({ example: 528000 })
  amount: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  paidAt: Date | null;
}

class StatusHistoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: '2026-04-10T10:00:00.000Z' })
  createdAt: Date;
}

class CustomerBriefDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: '0901234567' })
  phoneNumber: string;
}

// ─── List Item ───────────────────────────────────────────

export class OrderListItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'VNM260410A1B2C' })
  orderCode: string;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: 'PENDING' })
  paymentStatus: string;

  @ApiProperty({ example: 498000 })
  subtotal: number;

  @ApiProperty({ example: 0 })
  discountAmount: number;

  @ApiProperty({ example: 30000 })
  shippingFee: number;

  @ApiProperty({ example: 528000 })
  total: number;

  @ApiProperty({ example: '2026-04-10T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: [OrderItemDto] })
  items: OrderItemDto[];
}

// ─── Detail ──────────────────────────────────────────────

export class OrderDetailResponseDto extends OrderListItemResponseDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  shippingFullName: string;

  @ApiProperty({ example: '0901234567' })
  shippingPhoneNumber: string;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  shippingCity: string;

  @ApiProperty({ example: 'Quận 1' })
  shippingDistrict: string;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  shippingWard: string;

  @ApiProperty({ example: '123 Nguyễn Huệ' })
  shippingAddressLine: string;

  @ApiPropertyOptional({ example: 2, nullable: true })
  serviceTypeId: number | null;

  @ApiProperty({ example: 'KHONGCHOXEMHANG' })
  requiredNote: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  note: string | null;

  @ApiPropertyOptional({ example: null, nullable: true, description: 'Mã vận đơn GHN' })
  ghnOrderCode: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  expectedDeliveryTime: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  couponCode: string | null;

  @ApiProperty({ example: '2026-04-10T10:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [PaymentDto] })
  payments: PaymentDto[];

  @ApiProperty({ type: [StatusHistoryDto] })
  statusHistories: StatusHistoryDto[];
}

// ─── Admin Detail ────────────────────────────────────────

export class OrderAdminListItemResponseDto extends OrderListItemResponseDto {
  @ApiProperty({ type: CustomerBriefDto })
  customer: CustomerBriefDto;
}

export class OrderAdminDetailResponseDto extends OrderDetailResponseDto {
  @ApiProperty({ example: 1 })
  customerId: number;

  @ApiProperty({ type: CustomerBriefDto })
  customer: CustomerBriefDto;
}

// ─── List Responses ──────────────────────────────────────

export class OrderListResponseDto {
  @ApiProperty({ type: [OrderListItemResponseDto] })
  data: OrderListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class OrderAdminListResponseDto {
  @ApiProperty({ type: [OrderAdminListItemResponseDto] })
  data: OrderAdminListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
