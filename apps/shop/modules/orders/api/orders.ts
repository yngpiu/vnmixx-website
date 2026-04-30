import { apiClient } from '@/lib/axios';
import type {
  ListMyOrdersParams,
  MyOrderDetail,
  MyOrderListResponse,
} from '@/modules/orders/types/my-order';

export async function getMyOrders(params: ListMyOrdersParams): Promise<MyOrderListResponse> {
  const { data } = await apiClient.get<MyOrderListResponse>('/me/orders', { params });
  return data;
}

export async function getMyOrderDetail(orderCode: string): Promise<MyOrderDetail> {
  const { data } = await apiClient.get<MyOrderDetail>(
    `/me/orders/${encodeURIComponent(orderCode)}`,
  );
  return data;
}
