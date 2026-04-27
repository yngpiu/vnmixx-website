import { apiClient } from '@/lib/axios';
import type {
  DashboardCategoryRevenueResponse,
  DashboardDateRangeParams,
  DashboardKpisResponse,
  DashboardOrderStatusDistributionResponse,
  DashboardRecentOrdersResponse,
  DashboardRevenueTrendResponse,
  DashboardSummaryMetricsResponse,
  DashboardTopProductsResponse,
  InventoryLowStockResponse,
} from '@/modules/dashboard/types/dashboard';

export type DashboardTrendParams = DashboardDateRangeParams & {
  groupBy?: 'day' | 'month' | 'year';
};

export type DashboardTopProductsParams = DashboardDateRangeParams & {
  limit?: number;
  metric?: 'quantity' | 'revenue';
};

export type DashboardCategoryRevenueParams = DashboardDateRangeParams & {
  limit?: number;
};

export type DashboardRecentOrdersParams = {
  limit?: number;
};

export type InventoryLowStockParams = {
  threshold?: number;
  includeOutOfStock?: boolean;
  page?: number;
  limit?: number;
};

export async function getDashboardKpis(
  params: DashboardDateRangeParams,
): Promise<DashboardKpisResponse> {
  const { data } = await apiClient.get<DashboardKpisResponse>('/admin/dashboard/kpis', { params });
  return data;
}

export async function getDashboardRevenueTrend(
  params: DashboardTrendParams,
): Promise<DashboardRevenueTrendResponse> {
  const { data } = await apiClient.get<DashboardRevenueTrendResponse>(
    '/admin/dashboard/revenue-trend',
    {
      params,
    },
  );
  return data;
}

export async function getDashboardOrderStatusDistribution(
  params: DashboardDateRangeParams,
): Promise<DashboardOrderStatusDistributionResponse> {
  const { data } = await apiClient.get<DashboardOrderStatusDistributionResponse>(
    '/admin/dashboard/order-status-distribution',
    { params },
  );
  return data;
}

export async function getDashboardTopProducts(
  params: DashboardTopProductsParams,
): Promise<DashboardTopProductsResponse> {
  const { data } = await apiClient.get<DashboardTopProductsResponse>(
    '/admin/dashboard/top-products',
    {
      params,
    },
  );
  return data;
}

export async function getDashboardCategoryRevenue(
  params: DashboardCategoryRevenueParams,
): Promise<DashboardCategoryRevenueResponse> {
  const { data } = await apiClient.get<DashboardCategoryRevenueResponse>(
    '/admin/dashboard/category-revenue',
    { params },
  );
  return data;
}

export async function getDashboardSummaryMetrics(
  params: DashboardDateRangeParams,
): Promise<DashboardSummaryMetricsResponse> {
  const { data } = await apiClient.get<DashboardSummaryMetricsResponse>(
    '/admin/dashboard/summary-metrics',
    { params },
  );
  return data;
}

export async function getDashboardRecentOrders(
  params: DashboardRecentOrdersParams,
): Promise<DashboardRecentOrdersResponse> {
  const { data } = await apiClient.get<DashboardRecentOrdersResponse>(
    '/admin/dashboard/recent-orders',
    { params },
  );
  return data;
}

export async function getInventoryLowStock(
  params: InventoryLowStockParams,
): Promise<InventoryLowStockResponse> {
  const { data } = await apiClient.get<InventoryLowStockResponse>('/admin/inventory/low-stock', {
    params,
  });
  return data;
}
