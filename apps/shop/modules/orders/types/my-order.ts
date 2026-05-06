export type MyOrderStatus =
  | 'PENDING_CONFIRMATION'
  | 'PROCESSING'
  | 'AWAITING_SHIPMENT'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type MyPaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export interface MyOrderItem {
  id: number;
  productName: string;
  colorName: string;
  sizeLabel: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface MyOrderListItem {
  id: number;
  orderCode: string;
  status: MyOrderStatus;
  paymentStatus: MyPaymentStatus;
  subtotal: number;
  shippingFee: number;
  total: number;
  createdAt: string;
  items: MyOrderItem[];
}

export interface MyOrderListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MyOrderListResponse {
  data: MyOrderListItem[];
  meta: MyOrderListMeta;
}

export interface MyOrderPayment {
  id: number;
  method: 'COD' | 'BANK_TRANSFER_QR';
  status: MyPaymentStatus;
  transactionId: string | null;
  amount: number;
  paidAt: string | null;
}

export interface MyOrderDetail extends MyOrderListItem {
  paymentCode: string;
  shippingFullName: string;
  shippingPhoneNumber: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingWard: string;
  shippingAddressLine: string;
  requiredNote: string;
  note: string | null;
  ghnOrderCode: string | null;
  expectedDeliveryTime: string | null;
  updatedAt: string;
  payments: MyOrderPayment[];
}

export interface ListMyOrdersParams {
  page?: number;
  limit?: number;
  status?: MyOrderStatus;
}
