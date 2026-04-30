export type CheckoutPaymentMethod = 'COD' | 'BANK_TRANSFER_QR';

export interface ShippingServiceOption {
  serviceId: number;
  shortName: string;
  serviceTypeId: number;
  total: number;
  serviceFee: number;
  insuranceFee: number;
  leadtime: string;
}

export interface ShippingFeeResult {
  services: ShippingServiceOption[];
}

export interface CalculateShippingFeePayload {
  addressId: number;
}

export interface PlaceOrderPayload {
  addressId: number;
  paymentMethod: CheckoutPaymentMethod;
  requiredNote: 'CHOTHUHANG' | 'CHOXEMHANGKHONGTHU' | 'KHONGCHOXEMHANG';
  note?: string;
}

export interface QrCheckoutSession {
  provider: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrTemplate: string | null;
  amount: number;
  transferContent: string;
  qrImageUrl: string;
  status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string | null;
}

export interface PlaceOrderResult {
  id: number;
  orderCode: string;
  paymentCode: string;
  shippingFee: number;
  total: number;
  paymentStatus: string;
  checkoutSession: QrCheckoutSession | null;
}
