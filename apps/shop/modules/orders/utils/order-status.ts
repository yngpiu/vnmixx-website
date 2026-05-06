import type { MyOrderStatus } from '@/modules/orders/types/my-order';

const ORDER_STATUS_LABELS: Record<MyOrderStatus, string> = {
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  AWAITING_SHIPMENT: 'Chờ giao hàng',
  SHIPPED: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy đơn hàng',
};

export function getMyOrderStatusLabel(status: MyOrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export const MY_ORDER_STATUS_OPTIONS: Array<{ value: MyOrderStatus; label: string }> = (
  Object.keys(ORDER_STATUS_LABELS) as MyOrderStatus[]
).map((value) => ({
  value,
  label: ORDER_STATUS_LABELS[value],
}));
