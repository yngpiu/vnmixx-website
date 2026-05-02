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

/**
 * OrderItemDto: DTO chi tiết từng sản phẩm trong đơn hàng.
 */
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

/**
 * PaymentDto: DTO chi tiết thông tin thanh toán của đơn hàng.
 */
class PaymentDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'COD', enum: ['COD', 'BANK_TRANSFER_QR'] })
  method: string;

  @ApiProperty({
    example: 'PENDING',
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED'],
  })
  status: string;

  @ApiPropertyOptional({ example: 'SEPAY', nullable: true })
  provider: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  transactionId: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  providerReferenceCode: string | null;

  @ApiProperty({ example: 528000 })
  amount: number;

  @ApiProperty({ example: 528000 })
  amountPaid: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  paidAt: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  expiredAt: Date | null;
}

class QrCheckoutInfoDto {
  @ApiProperty({ example: 'SEPAY' })
  provider: string;

  @ApiProperty({ example: 'MBBank' })
  bankCode: string;

  @ApiProperty({ example: 'Ngân hàng TMCP Quân đội' })
  bankName: string;

  @ApiProperty({ example: '0903252427' })
  accountNumber: string;

  @ApiProperty({ example: 'BUI TAN VIET' })
  accountName: string;

  @ApiPropertyOptional({ example: 'compact', nullable: true })
  qrTemplate: string | null;

  @ApiProperty({ example: 528000 })
  amount: number;

  @ApiProperty({ example: 'DHVNM260410A1B2C' })
  transferContent: string;

  @ApiProperty({
    example:
      'https://qr.sepay.vn/img?bank=MBBank&acc=0903252427&template=compact&amount=528000&des=DHVNM260410A1B2C',
  })
  qrImageUrl: string;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'PAID', 'EXPIRED', 'CANCELLED'] })
  status: string;

  @ApiPropertyOptional({ example: '2026-04-10T10:15:00.000Z', nullable: true })
  expiresAt: Date | null;
}

/**
 * StatusHistoryDto: DTO ghi lại các mốc thay đổi trạng thái của đơn hàng.
 */
class StatusHistoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: '2026-04-10T10:00:00.000Z' })
  createdAt: Date;
}

/**
 * CustomerBriefDto: DTO chứa thông tin cơ bản của khách hàng chủ đơn.
 */
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

/**
 * OrderListItemResponseDto: DTO tóm tắt thông tin đơn hàng trong danh sách.
 */
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

/**
 * OrderDetailResponseDto: DTO chi tiết đầy đủ một đơn hàng dành cho khách hàng.
 */
export class OrderDetailResponseDto extends OrderListItemResponseDto {
  @ApiProperty({ example: 'DHVNM260410A1B2C' })
  paymentCode: string;

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

  @ApiProperty({ example: 1200, description: 'Khối lượng kiện hàng (gram)' })
  packageWeight: number;

  @ApiProperty({ example: 40, description: 'Chiều dài kiện hàng (cm)' })
  packageLength: number;

  @ApiProperty({ example: 30, description: 'Chiều rộng kiện hàng (cm)' })
  packageWidth: number;

  @ApiProperty({ example: 20, description: 'Chiều cao kiện hàng (cm)' })
  packageHeight: number;

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

  @ApiProperty({ example: '2026-04-10T10:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [PaymentDto] })
  payments: PaymentDto[];

  @ApiPropertyOptional({ type: QrCheckoutInfoDto, nullable: true })
  checkoutSession: QrCheckoutInfoDto | null;

  @ApiProperty({ type: [StatusHistoryDto] })
  statusHistories: StatusHistoryDto[];
}

export class OrderPaymentStatusResponseDto {
  @ApiProperty({ example: 'VNM260410A1B2C' })
  orderCode: string;

  @ApiProperty({ example: 'PENDING_PAYMENT' })
  orderStatus: string;

  @ApiProperty({ example: 'PENDING' })
  paymentStatus: string;

  @ApiProperty({ example: 'DHVNM260410A1B2C' })
  paymentCode: string;

  @ApiPropertyOptional({ type: QrCheckoutInfoDto, nullable: true })
  checkoutSession: QrCheckoutInfoDto | null;
}

/**
 * OrderAdminListItemResponseDto: DTO tóm tắt đơn hàng kèm thông tin khách hàng cho Admin.
 */
export class OrderAdminListItemResponseDto extends OrderListItemResponseDto {
  @ApiProperty({ type: CustomerBriefDto })
  customer: CustomerBriefDto;
}

/**
 * OrderAdminDetailResponseDto: DTO chi tiết đầy đủ đơn hàng cho Admin.
 */
export class OrderAdminDetailResponseDto extends OrderDetailResponseDto {
  @ApiProperty({ example: 1 })
  customerId: number;

  @ApiProperty({ type: CustomerBriefDto })
  customer: CustomerBriefDto;
}

/**
 * OrderListResponseDto: DTO bọc danh sách đơn hàng và meta phân trang cho khách.
 */
export class OrderListResponseDto {
  @ApiProperty({ type: [OrderListItemResponseDto] })
  data: OrderListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/**
 * OrderAdminListResponseDto: DTO bọc danh sách đơn hàng và meta phân trang cho Admin.
 */
export class OrderAdminListResponseDto {
  @ApiProperty({ type: [OrderAdminListItemResponseDto] })
  data: OrderAdminListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
