/** Khớp DTO admin đơn hàng từ `apps/api` (OrderAdmin*). */

export type OrderStatus =
  | 'PENDING_CONFIRMATION'
  | 'PROCESSING'
  | 'AWAITING_SHIPMENT'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export type PaymentMethod = 'COD' | 'BANK_TRANSFER_QR';

export interface OrderItemAdmin {
  id: number;
  productName: string;
  colorName: string;
  sizeLabel: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface PaymentAdmin {
  id: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  amount: number;
  paidAt: string | null;
}

export type SepayMatchStatus = 'UNMATCHED' | 'MATCHED' | 'IGNORED';

export interface SepayTransactionAdmin {
  id: number;
  sepayTransactionId: number;
  transferAmount: number;
  content: string;
  referenceCode: string | null;
  orderId: number | null;
  orderCode: string | null;
  paymentId: number | null;
  matchedOrderCode: string | null;
  matchStatus: SepayMatchStatus;
  receivedAt: string;
  processedAt: string | null;
}

export interface StatusHistoryAdmin {
  id: number;
  status: OrderStatus;
  createdAt: string;
}

export interface CustomerBriefAdmin {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface OrderAdminListItem {
  id: number;
  orderCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  payment?: {
    method: PaymentMethod;
    status: PaymentStatus;
  } | null;
  subtotal: number;
  shippingFee: number;
  total: number;
  createdAt: string;
  items: OrderItemAdmin[];
  customer: CustomerBriefAdmin;
}

export interface ListPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OrderAdminListResponse {
  data: OrderAdminListItem[];
  meta: ListPaginationMeta;
}

export interface OrderAdminDetail extends OrderAdminListItem {
  shippingFullName: string;
  shippingPhoneNumber: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingWard: string;
  shippingAddressLine: string;
  packageWeight: number;
  packageLength: number;
  packageWidth: number;
  packageHeight: number;
  serviceTypeId: number | null;
  requiredNote: string;
  note: string | null;
  ghnOrderCode: string | null;
  expectedDeliveryTime: string | null;
  updatedAt: string;
  payments: PaymentAdmin[];
  statusHistories: StatusHistoryAdmin[];
  customerId: number;
}

export type ListAdminOrdersParams = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  customerId?: number;
};

export interface SepayTransactionListResponse {
  data: SepayTransactionAdmin[];
  meta: ListPaginationMeta;
}
