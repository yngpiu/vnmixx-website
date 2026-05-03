import { apiClient } from '@/lib/axios';
import type { PaginatedWishlistResult, WishlistItem } from '@/modules/wishlist/types/wishlist';

export async function getMyWishlist(params: {
  page: number;
  limit: number;
}): Promise<PaginatedWishlistResult> {
  const { data } = await apiClient.get<{
    data: WishlistItem[];
    meta: PaginatedWishlistResult['meta'];
  }>('/me/wishlist', {
    params: {
      page: params.page,
      limit: params.limit,
    },
  });
  return {
    data: Array.isArray(data.data) ? data.data : [],
    meta: data.meta,
  };
}

export async function addMyWishlistItem(productId: number): Promise<void> {
  await apiClient.post(`/me/wishlist/${productId}`);
}

export async function removeMyWishlistItem(productId: number): Promise<void> {
  await apiClient.delete(`/me/wishlist/${productId}`);
}
