import { apiClient } from '@/lib/axios';
import type {
  AnalyticsKpisWithDeltaResponse,
  AnalyticsPaymentMethodMixOnlyResponse,
  AnalyticsPaymentStatusMixOnlyResponse,
  AnalyticsPendingOrdersOnlyResponse,
  AnalyticsPeriod,
  AnalyticsReviewsSummaryResponse,
  AnalyticsStatusBreakdownOnlyResponse,
  AnalyticsTimeseriesResponse,
  AnalyticsTopProductsResponse,
  AnalyticsTopShippingCitiesResponse,
} from '@/modules/analytics/types/analytics';

export async function getAnalyticsKpisWithDelta(
  params: AnalyticsPeriod,
): Promise<AnalyticsKpisWithDeltaResponse> {
  const { data } = await apiClient.get<AnalyticsKpisWithDeltaResponse>(
    '/admin/analytics/kpis-with-delta',
    { params },
  );
  return data;
}

export async function getAnalyticsTimeseries(
  params: AnalyticsPeriod,
): Promise<AnalyticsTimeseriesResponse> {
  const { data } = await apiClient.get<AnalyticsTimeseriesResponse>('/admin/analytics/timeseries', {
    params: { ...params, granularity: 'day' },
  });
  return data;
}

export async function getAnalyticsStatusBreakdown(
  params: AnalyticsPeriod,
): Promise<AnalyticsStatusBreakdownOnlyResponse> {
  const { data } = await apiClient.get<AnalyticsStatusBreakdownOnlyResponse>(
    '/admin/analytics/breakdowns/status',
    { params },
  );
  return data;
}

export async function getAnalyticsPaymentMethodMix(
  params: AnalyticsPeriod,
): Promise<AnalyticsPaymentMethodMixOnlyResponse> {
  const { data } = await apiClient.get<AnalyticsPaymentMethodMixOnlyResponse>(
    '/admin/analytics/breakdowns/payment-method',
    { params },
  );
  return data;
}

export async function getAnalyticsPaymentStatusMix(
  params: AnalyticsPeriod,
): Promise<AnalyticsPaymentStatusMixOnlyResponse> {
  const { data } = await apiClient.get<AnalyticsPaymentStatusMixOnlyResponse>(
    '/admin/analytics/breakdowns/payment-status',
    { params },
  );
  return data;
}

export async function getAnalyticsPendingOrders(
  params: AnalyticsPeriod,
): Promise<AnalyticsPendingOrdersOnlyResponse> {
  const { data } = await apiClient.get<AnalyticsPendingOrdersOnlyResponse>(
    '/admin/analytics/orders/pending-actions',
    { params },
  );
  return data;
}

export async function getAnalyticsTopShippingCities(
  params: AnalyticsPeriod & { limit?: number },
): Promise<AnalyticsTopShippingCitiesResponse> {
  const { data } = await apiClient.get<AnalyticsTopShippingCitiesResponse>(
    '/admin/analytics/top-shipping-cities',
    { params },
  );
  return data;
}

export async function getAnalyticsTopProducts(
  params: AnalyticsPeriod,
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
  params: AnalyticsPeriod,
): Promise<AnalyticsReviewsSummaryResponse> {
  const { data } = await apiClient.get<AnalyticsReviewsSummaryResponse>(
    '/admin/analytics/reviews/summary',
    { params },
  );
  return data;
}
