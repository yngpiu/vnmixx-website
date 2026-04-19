/** Khớp DTO admin đơn hàng từ `apps/api` (OrderAdmin*). */

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'AWAITING_SHIPMENT'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type PaymentMethod = 'COD' | 'BANK_TRANSFER';

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
  subtotal: number;
  discountAmount: number;
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
  couponCode: string | null;
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

export type ConfirmOrderShipmentInput = {
  weight: number;
  length: number;
  width: number;
  height: number;
};
