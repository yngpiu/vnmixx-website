export type InventoryStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type InventoryListItem = {
  variantId: number;
  productId: number;
  productName: string;
  thumbnailUrl: string | null;
  sku: string;
  colorName: string | null;
  sizeLabel: string | null;
  onHand: number;
  reserved: number;
  available: number;
  status: InventoryStockStatus;
  updatedAt: string;
};

export type InventoryListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryListResponse = {
  data: InventoryListItem[];
  meta: InventoryListMeta;
};

export type ListInventoryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: InventoryStockStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type InventoryMovementType =
  | 'IMPORT'
  | 'EXPORT'
  | 'RESERVE'
  | 'RELEASE'
  | 'ADJUSTMENT'
  | 'RETURN';

export type InventoryMovementItem = {
  id: number;
  variantId: number;
  productName: string;
  sku: string;
  type: InventoryMovementType;
  delta: number;
  onHandAfter: number;
  reservedAfter: number;
  note: string | null;
  createdAt: string;
  employeeName: string | null;
  voucherId: number | null;
  voucherCode: string | null;
};

export type InventoryMovementsResponse = {
  data: InventoryMovementItem[];
  meta: InventoryListMeta;
};

export type ListInventoryMovementsParams = {
  page?: number;
  limit?: number;
  variantId?: number;
  type?: InventoryMovementType;
  voucherId?: number;
};

export type InventoryTransactionBody = {
  variantId: number;
  quantity: number;
  note?: string;
};

export type InventoryVoucherType = 'IMPORT' | 'EXPORT';
export type InventoryVoucherStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export type CreateInventoryVoucherItemBody = {
  variantId: number;
  quantity: number;
  unitPrice: number;
  note?: string;
};

export type CreateInventoryVoucherBody = {
  code: string;
  type: InventoryVoucherType;
  issuedAt?: string;
  note?: string;
  items: CreateInventoryVoucherItemBody[];
};

export type InventoryVoucherItem = {
  id: number;
  variantId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  note: string | null;
};

export type InventoryVoucherDetail = {
  id: number;
  code: string;
  type: InventoryVoucherType;
  status: InventoryVoucherStatus;
  issuedAt: string;
  totalQuantity: number;
  totalAmount: number;
  note: string | null;
  createdByEmployeeName: string | null;
  items: InventoryVoucherItem[];
};

export type InventoryVoucherListItem = {
  id: number;
  code: string;
  type: InventoryVoucherType;
  status: InventoryVoucherStatus;
  issuedAt: string;
  totalQuantity: number;
  totalAmount: number;
  note: string | null;
  createdAt: string;
  createdByEmployeeName: string | null;
};

export type InventoryVoucherListResponse = {
  data: InventoryVoucherListItem[];
  meta: InventoryListMeta;
};
