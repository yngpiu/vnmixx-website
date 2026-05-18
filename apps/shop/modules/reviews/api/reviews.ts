import { apiClient } from '@/lib/axios';

export type CreateReviewPayload = {
  productId: number;
  orderItemId?: number;
  rating: number;
  title?: string;
  content?: string;
};

export async function createProductReview(payload: CreateReviewPayload): Promise<{ id: number }> {
  const { data } = await apiClient.post<{ id: number }>('/me/reviews', payload);
  return data;
}
