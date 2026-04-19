import { apiClient } from '@/lib/axios';
import type {
  AdminReviewDetailResponse,
  AdminReviewsListResponse,
} from '@/modules/reviews/types/review-admin';

export type AdminReviewListParams = {
  page?: number;
  pageSize?: number;
  visibility?: 'all' | 'visible' | 'hidden';
  keyword?: string;
  customerId?: number;
};

export async function getAdminReviews(
  params: AdminReviewListParams,
): Promise<AdminReviewsListResponse> {
  const { data } = await apiClient.get<AdminReviewsListResponse>('/admin/reviews', { params });
  return data;
}

export async function getAdminReviewDetail(reviewId: number): Promise<AdminReviewDetailResponse> {
  const { data } = await apiClient.get<AdminReviewDetailResponse>(`/admin/reviews/${reviewId}`);
  return data;
}

export async function updateAdminReviewStatus(
  reviewId: number,
  status: 'VISIBLE' | 'HIDDEN',
): Promise<AdminReviewDetailResponse> {
  const { data } = await apiClient.patch<AdminReviewDetailResponse>(
    `/admin/reviews/${reviewId}/visibility`,
    {
      status,
    },
  );
  return data;
}

export async function deleteAdminReview(reviewId: number): Promise<void> {
  await apiClient.delete(`/admin/reviews/${reviewId}`);
}
