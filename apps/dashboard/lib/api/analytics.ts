import { apiClient } from '@/lib/axios';
import type {
  AnalyticsOverviewResponse,
  AnalyticsTimeseriesResponse,
  AnalyticsTopShippingCitiesResponse,
} from '@/lib/types/analytics';

export type AnalyticsDateRangeParams = {
  from: string;
  to: string;
};

export async function getAnalyticsOverview(
  params: AnalyticsDateRangeParams,
): Promise<AnalyticsOverviewResponse> {
  const { data } = await apiClient.get<AnalyticsOverviewResponse>('/admin/analytics/overview', {
    params,
  });
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

export async function getAnalyticsTopShippingCities(
  params: AnalyticsDateRangeParams & { limit?: number },
): Promise<AnalyticsTopShippingCitiesResponse> {
  const { data } = await apiClient.get<AnalyticsTopShippingCitiesResponse>(
    '/admin/analytics/top-shipping-cities',
    { params },
  );
  return data;
}
