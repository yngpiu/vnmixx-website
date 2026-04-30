import { apiClient } from '@/lib/axios';
import type { WishlistItem } from '@/modules/wishlist/types/wishlist';

export async function getMyWishlist(): Promise<WishlistItem[]> {
  const { data } = await apiClient.get<WishlistItem[]>('/me/wishlist');
  return Array.isArray(data) ? data : [];
}

export async function addMyWishlistItem(productId: number): Promise<void> {
  await apiClient.post(`/me/wishlist/${productId}`);
}

export async function removeMyWishlistItem(productId: number): Promise<void> {
  await apiClient.delete(`/me/wishlist/${productId}`);
}
