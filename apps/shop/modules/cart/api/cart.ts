import { apiClient } from '@/lib/axios';
import type {
  AddCartItemPayload,
  Cart,
  CartItem,
  UpdateCartItemPayload,
} from '@/modules/cart/types/cart';

export async function getMyCart(): Promise<Cart> {
  const { data } = await apiClient.get<Cart>('/me/cart');
  return data;
}

export async function addMyCartItem(payload: AddCartItemPayload): Promise<CartItem> {
  const { data } = await apiClient.post<CartItem>('/me/cart/items', payload);
  return data;
}

export async function updateMyCartItem({
  itemId,
  payload,
}: {
  itemId: number;
  payload: UpdateCartItemPayload;
}): Promise<CartItem> {
  const { data } = await apiClient.patch<CartItem>(`/me/cart/items/${itemId}`, payload);
  return data;
}

export async function removeMyCartItem(itemId: number): Promise<void> {
  await apiClient.delete(`/me/cart/items/${itemId}`);
}
