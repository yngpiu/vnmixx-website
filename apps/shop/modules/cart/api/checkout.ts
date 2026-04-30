import { apiClient } from '@/lib/axios';
import type {
  CalculateShippingFeePayload,
  PlaceOrderPayload,
  PlaceOrderResult,
  ShippingFeeResult,
} from '@/modules/cart/types/checkout';

export async function calculateShippingFee(
  payload: CalculateShippingFeePayload,
): Promise<ShippingFeeResult> {
  const { data } = await apiClient.post<ShippingFeeResult>('/shipping/fee', payload);
  return data;
}

export async function placeMyOrder(payload: PlaceOrderPayload): Promise<PlaceOrderResult> {
  const { data } = await apiClient.post<PlaceOrderResult>('/me/orders', payload);
  return data;
}

export async function getMyOrderDetail(orderCode: string): Promise<PlaceOrderResult> {
  const { data } = await apiClient.get<PlaceOrderResult>(
    `/me/orders/${encodeURIComponent(orderCode)}`,
  );
  return data;
}

export async function cancelMyOrder(orderCode: string): Promise<PlaceOrderResult> {
  const { data } = await apiClient.post<PlaceOrderResult>(
    `/me/orders/${encodeURIComponent(orderCode)}/cancel`,
  );
  return data;
}
