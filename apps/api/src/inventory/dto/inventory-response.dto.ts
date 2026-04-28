import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ enum: ['in_stock', 'low_stock', 'out_of_stock', 'anomaly'] })
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'anomaly';

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
