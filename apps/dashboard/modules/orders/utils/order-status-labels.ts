import type { OrderStatus, PaymentStatus } from '@/modules/orders/types/order-admin';

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  AWAITING_SHIPMENT: 'Chờ giao hàng',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thanh toán',
  SUCCESS: 'Đã thanh toán',
  FAILED: 'Thất bại',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
};

const ORDER_STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  PENDING_PAYMENT:
    'border-transparent bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/70 dark:text-amber-100 dark:hover:bg-amber-900/60',
  PENDING_CONFIRMATION:
    'border-transparent bg-yellow-50 text-yellow-900 hover:bg-yellow-100 dark:bg-yellow-950/70 dark:text-yellow-100 dark:hover:bg-yellow-900/60',
  PROCESSING:
    'border-transparent bg-blue-50 text-blue-900 hover:bg-blue-100 dark:bg-blue-950/70 dark:text-blue-100 dark:hover:bg-blue-900/60',
  AWAITING_SHIPMENT:
    'border-transparent bg-cyan-50 text-cyan-900 hover:bg-cyan-100 dark:bg-cyan-950/70 dark:text-cyan-100 dark:hover:bg-cyan-900/60',
  SHIPPED:
    'border-transparent bg-indigo-50 text-indigo-900 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-100 dark:hover:bg-indigo-900/60',
  DELIVERED:
    'border-transparent bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-100 dark:hover:bg-emerald-900/60',
  CANCELLED:
    'border-transparent bg-red-50 text-red-900 hover:bg-red-100 dark:bg-red-950/70 dark:text-red-100 dark:hover:bg-red-900/60',
};

const PAYMENT_STATUS_BADGE_CLASSES: Record<PaymentStatus, string> = {
  PENDING:
    'border-transparent bg-sky-50 text-sky-900 hover:bg-sky-100 dark:bg-sky-950/70 dark:text-sky-100 dark:hover:bg-sky-900/60',
  SUCCESS:
    'border-transparent bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-100 dark:hover:bg-emerald-900/60',
  FAILED:
    'border-transparent bg-red-50 text-red-900 hover:bg-red-100 dark:bg-red-950/70 dark:text-red-100 dark:hover:bg-red-900/60',
  EXPIRED:
    'border-transparent bg-orange-50 text-orange-900 hover:bg-orange-100 dark:bg-orange-950/70 dark:text-orange-100 dark:hover:bg-orange-900/60',
  CANCELLED:
    'border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
};

export function getOrderStatusBadgeClassName(status: OrderStatus): string {
  return ORDER_STATUS_BADGE_CLASSES[status] ?? 'border-transparent bg-muted text-muted-foreground';
}

export function getPaymentStatusBadgeClassName(status: PaymentStatus): string {
  return (
    PAYMENT_STATUS_BADGE_CLASSES[status] ?? 'border-transparent bg-muted text-muted-foreground'
  );
}

export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export const ORDER_STATUS_FILTER_OPTIONS: { label: string; value: OrderStatus }[] = (
  Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]
).map((value) => ({ label: ORDER_STATUS_LABELS[value], value }));

export const PAYMENT_STATUS_FILTER_OPTIONS: { label: string; value: PaymentStatus }[] = (
  Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]
).map((value) => ({ label: PAYMENT_STATUS_LABELS[value], value }));
