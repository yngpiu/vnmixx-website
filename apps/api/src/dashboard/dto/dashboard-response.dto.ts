import { ApiProperty } from '@nestjs/swagger';

export class DashboardKpiCardDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  deltaPercent: number;

  @ApiProperty({ enum: ['up', 'down', 'flat'] })
  trend: 'up' | 'down' | 'flat';
}

export class DashboardKpisResponseDto {
  @ApiProperty({ type: [DashboardKpiCardDto] })
  cards: DashboardKpiCardDto[];
}

export class DashboardTrendBucketDto {
  @ApiProperty()
  bucket: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  previousValue: number;
}

export class DashboardRevenueTrendResponseDto {
  @ApiProperty({ type: [DashboardTrendBucketDto] })
  buckets: DashboardTrendBucketDto[];
}

export class DashboardStatusSegmentDto {
  @ApiProperty()
  status: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  percentage: number;
}

export class DashboardOrderStatusDistributionResponseDto {
  @ApiProperty()
  totalOrders: number;

  @ApiProperty({ type: [DashboardStatusSegmentDto] })
  segments: DashboardStatusSegmentDto[];
}

export class DashboardTopProductItemDto {
  @ApiProperty()
  productId: number;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  soldQuantity: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty({ nullable: true })
  thumbnailUrl: string | null;
}

export class DashboardTopProductsResponseDto {
  @ApiProperty({ type: [DashboardTopProductItemDto] })
  items: DashboardTopProductItemDto[];
}

export class DashboardCategoryRevenueItemDto {
  @ApiProperty()
  categoryId: number;

  @ApiProperty()
  categoryName: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  percentage: number;
}

export class DashboardCategoryRevenueResponseDto {
  @ApiProperty({ type: [DashboardCategoryRevenueItemDto] })
  segments: DashboardCategoryRevenueItemDto[];
}

export class DashboardSummaryMetricDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  deltaPercent: number;

  @ApiProperty({ enum: ['up', 'down', 'flat'] })
  trend: 'up' | 'down' | 'flat';
}

export class DashboardSummaryMetricsResponseDto {
  @ApiProperty({ type: [DashboardSummaryMetricDto] })
  metrics: DashboardSummaryMetricDto[];
}

export class DashboardRecentOrderItemDto {
  @ApiProperty()
  orderCode: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  status: string;
}

export class DashboardRecentOrdersResponseDto {
  @ApiProperty({ type: [DashboardRecentOrderItemDto] })
  items: DashboardRecentOrderItemDto[];
}

export class InventoryLowStockItemDto {
  @ApiProperty()
  productId: number;

  @ApiProperty()
  productName: string;

  @ApiProperty({ nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ nullable: true })
  colorName: string | null;

  @ApiProperty({ nullable: true })
  sizeLabel: string | null;

  @ApiProperty()
  skuSummary: string;

  @ApiProperty()
  stock: number;

  @ApiProperty({ enum: ['out_of_stock', 'low_stock'] })
  statusLabel: 'out_of_stock' | 'low_stock';
}

export class InventoryLowStockResponseDto {
  @ApiProperty({ type: [InventoryLowStockItemDto] })
  data: InventoryLowStockItemDto[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class InventoryListItemDto {
  @ApiProperty()
  variantId: number;

  @ApiProperty()
  productId: number;

  @ApiProperty()
  productName: string;

  @ApiProperty({ nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty()
  sku: string;

  @ApiProperty({ nullable: true })
  colorName: string | null;

  @ApiProperty({ nullable: true })
  sizeLabel: string | null;

  @ApiProperty()
  onHand: number;

  @ApiProperty()
  reserved: number;

  @ApiProperty()
  available: number;

  @ApiProperty({ enum: ['in_stock', 'low_stock', 'out_of_stock'] })
  status: 'in_stock' | 'low_stock' | 'out_of_stock';

  @ApiProperty()
  updatedAt: Date;
}

export class InventoryListResponseDto {
  @ApiProperty({ type: [InventoryListItemDto] })
  data: InventoryListItemDto[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class InventoryMovementItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  variantId: number;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  sku: string;

  @ApiProperty({ enum: ['IMPORT', 'EXPORT', 'RESERVE', 'RELEASE', 'ADJUSTMENT', 'RETURN'] })
  type: 'IMPORT' | 'EXPORT' | 'RESERVE' | 'RELEASE' | 'ADJUSTMENT' | 'RETURN';

  @ApiProperty()
  delta: number;

  @ApiProperty()
  onHandAfter: number;

  @ApiProperty()
  reservedAfter: number;

  @ApiProperty({ nullable: true })
  note: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  employeeName: string | null;

  @ApiProperty({ nullable: true })
  voucherId: number | null;

  @ApiProperty({ nullable: true })
  voucherCode: string | null;
}

export class InventoryMovementListResponseDto {
  @ApiProperty({ type: [InventoryMovementItemDto] })
  data: InventoryMovementItemDto[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class InventoryVoucherListItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: string;

  @ApiProperty({ enum: ['IMPORT', 'EXPORT'] })
  type: 'IMPORT' | 'EXPORT';

  @ApiProperty({ enum: ['DRAFT', 'CONFIRMED', 'CANCELLED'] })
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

  @ApiProperty()
  issuedAt: Date;

  @ApiProperty()
  totalQuantity: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ nullable: true })
  note: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  createdByEmployeeName: string | null;
}

export class InventoryVoucherListResponseDto {
  @ApiProperty({ type: [InventoryVoucherListItemDto] })
  data: InventoryVoucherListItemDto[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class InventoryVoucherItemResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  variantId: number;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  lineAmount: number;

  @ApiProperty({ nullable: true })
  note: string | null;
}

export class InventoryVoucherDetailResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: string;

  @ApiProperty({ enum: ['IMPORT', 'EXPORT'] })
  type: 'IMPORT' | 'EXPORT';

  @ApiProperty({ enum: ['DRAFT', 'CONFIRMED', 'CANCELLED'] })
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

  @ApiProperty()
  issuedAt: Date;

  @ApiProperty()
  totalQuantity: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ nullable: true })
  note: string | null;

  @ApiProperty({ nullable: true })
  createdByEmployeeName: string | null;

  @ApiProperty({ type: [InventoryVoucherItemResponseDto] })
  items: InventoryVoucherItemResponseDto[];
}
