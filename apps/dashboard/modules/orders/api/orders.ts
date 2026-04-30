import { apiClient } from '@/lib/axios';
import type {
  ListAdminOrdersParams,
  OrderAdminDetail,
  OrderAdminListResponse,
} from '@/modules/orders/types/order-admin';
export type { ListAdminOrdersParams } from '@/modules/orders/types/order-admin';

export async function listAdminOrders(
  params: ListAdminOrdersParams = {},
): Promise<OrderAdminListResponse> {
  const { data } = await apiClient.get<OrderAdminListResponse>('/admin/orders', { params });
  return data;
}

export async function getAdminOrder(orderCode: string): Promise<OrderAdminDetail> {
  const { data } = await apiClient.get<OrderAdminDetail>(
    `/admin/orders/${encodeURIComponent(orderCode)}`,
  );
  return data;
}

export async function confirmAdminOrder(orderCode: string): Promise<OrderAdminDetail> {
  const { data } = await apiClient.patch<OrderAdminDetail>(
    `/admin/orders/${encodeURIComponent(orderCode)}/confirm`,
  );
  return data;
}

export async function cancelAdminOrder(orderCode: string): Promise<OrderAdminDetail> {
  const { data } = await apiClient.patch<OrderAdminDetail>(
    `/admin/orders/${encodeURIComponent(orderCode)}/cancel`,
  );
  return data;
}

export async function confirmAdminOrderPayment(orderCode: string): Promise<OrderAdminDetail> {
  const { data } = await apiClient.patch<OrderAdminDetail>(
    `/admin/orders/${encodeURIComponent(orderCode)}/confirm-payment`,
  );
  return data;
}
