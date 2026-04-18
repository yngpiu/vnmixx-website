import { apiClient } from '@/lib/axios';
import type {
  AdminReviewDetailResponse,
  AdminReviewsListResponse,
  AnalyticsKpisWithDeltaResponse,
  AnalyticsPaymentMethodMixOnlyResponse,
  AnalyticsPaymentStatusMixOnlyResponse,
  AnalyticsPendingOrdersOnlyResponse,
  AnalyticsReviewsSummaryResponse,
  AnalyticsStatusBreakdownOnlyResponse,
  AnalyticsTimeseriesResponse,
  AnalyticsTopProductsResponse,
  AnalyticsTopShippingCitiesResponse,
} from '@/lib/types/analytics';

export type AnalyticsDateRangeParams = {
  from: string;
  to: string;
};

export type AdminReviewListParams = {
  page?: number;
  pageSize?: number;
  visibility?: 'all' | 'visible' | 'hidden';
  keyword?: string;
  customerId?: number;
};

export async function getAnalyticsKpisWithDelta(
  params: AnalyticsDateRangeParams,
): Promise<AnalyticsKpisWithDeltaResponse> {
  const { data } = await apiClient.get<AnalyticsKpisWithDeltaResponse>(
    '/admin/analytics/kpis-with-delta',
    { params },
  );
  return data;
}

export async function getAnalyticsTimeseries(
  params: AnalyticsDateRangeParams,
): Promise<AnalyticsTimeseriesResponse> {
  const { data } = await apiClient.get<AnalyticsTimeseriesResponse>('/admin/analytics/timeseries', {
    params: { ...params, granularity: 'day' },
  });
  return data;
}

export async function getAnalyticsStatusBreakdown(
  params: AnalyticsDateRangeParams,
): Promise<AnalyticsStatusBreakdownOnlyResponse> {
  const { data } = await apiClient.get<AnalyticsStatusBreakdownOnlyResponse>(
    '/admin/analytics/breakdowns/status',
    { params },
  );
  return data;
}

export async function getAnalyticsPaymentMethodMix(
  params: AnalyticsDateRangeParams,
): Promise<AnalyticsPaymentMethodMixOnlyResponse> {
  const { data } = await apiClient.get<AnalyticsPaymentMethodMixOnlyResponse>(
    '/admin/analytics/breakdowns/payment-method',
    { params },
  );
  return data;
}

export async function getAnalyticsPaymentStatusMix(
  params: AnalyticsDateRangeParams,
): Promise<AnalyticsPaymentStatusMixOnlyResponse> {
  const { data } = await apiClient.get<AnalyticsPaymentStatusMixOnlyResponse>(
    '/admin/analytics/breakdowns/payment-status',
    { params },
  );
  return data;
}

export async function getAnalyticsPendingOrders(
  params: AnalyticsDateRangeParams,
): Promise<AnalyticsPendingOrdersOnlyResponse> {
  const { data } = await apiClient.get<AnalyticsPendingOrdersOnlyResponse>(
    '/admin/analytics/orders/pending-actions',
    { params },
  );
  return data;
}

export async function getAnalyticsTopShippingCities(
  params: AnalyticsDateRangeParams & { limit?: number },
): Promise<AnalyticsTopShippingCitiesResponse> {
  const { data } = await apiClient.get<AnalyticsTopShippingCitiesResponse>(
    '/admin/analytics/top-shipping-cities',
    { params },
  );
  return data;
}

export async function getAnalyticsTopProducts(
  params: AnalyticsDateRangeParams,
): Promise<AnalyticsTopProductsResponse> {
  const { data } = await apiClient.get<AnalyticsTopProductsResponse>(
    '/admin/analytics/top-products',
    {
      params,
    },
  );
  return data;
}

export async function getAnalyticsReviewsSummary(
  params: AnalyticsDateRangeParams,
): Promise<AnalyticsReviewsSummaryResponse> {
  const { data } = await apiClient.get<AnalyticsReviewsSummaryResponse>(
    '/admin/analytics/reviews/summary',
    { params },
  );
  return data;
}

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
