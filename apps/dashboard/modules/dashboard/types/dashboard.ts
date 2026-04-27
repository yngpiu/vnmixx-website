export type DashboardTrend = 'up' | 'down' | 'flat';

export interface DashboardKpiCard {
  key: 'revenue' | 'orders' | 'newCustomers' | 'aov' | string;
  label: string;
  value: number;
  deltaPercent: number;
  trend: DashboardTrend;
}

export interface DashboardKpisResponse {
  cards: DashboardKpiCard[];
}

export interface DashboardTrendBucket {
  bucket: string;
  value: number;
  previousValue: number;
}

export interface DashboardRevenueTrendResponse {
  buckets: DashboardTrendBucket[];
}

export interface DashboardStatusSegment {
  status: string;
  label: string;
  value: number;
  percentage: number;
}

export interface DashboardOrderStatusDistributionResponse {
  totalOrders: number;
  segments: DashboardStatusSegment[];
}

export interface DashboardTopProductItem {
  productId: number;
  productName: string;
  soldQuantity: number;
  revenue: number;
  thumbnailUrl: string | null;
}

export interface DashboardTopProductsResponse {
  items: DashboardTopProductItem[];
}

export interface DashboardCategoryRevenueItem {
  categoryId: number;
  categoryName: string;
  revenue: number;
  percentage: number;
}

export interface DashboardCategoryRevenueResponse {
  segments: DashboardCategoryRevenueItem[];
}

export interface DashboardSummaryMetric {
  key:
    | 'totalOrders'
    | 'conversionRate'
    | 'averageRating'
    | 'totalProducts'
    | 'totalCustomers'
    | string;
  label: string;
  value: number;
  deltaPercent: number;
  trend: DashboardTrend;
}

export interface DashboardSummaryMetricsResponse {
  metrics: DashboardSummaryMetric[];
}

export interface DashboardRecentOrderItem {
  orderCode: string;
  customerName: string;
  createdAt: string;
  totalAmount: number;
  status: string;
}

export interface DashboardRecentOrdersResponse {
  items: DashboardRecentOrderItem[];
}

export interface InventoryLowStockItem {
  productId: number;
  productName: string;
  thumbnailUrl: string | null;
  colorName: string | null;
  sizeLabel: string | null;
  skuSummary: string;
  stock: number;
  statusLabel: 'out_of_stock' | 'low_stock';
}

export interface InventoryLowStockResponse {
  data: InventoryLowStockItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type DashboardDateRangeParams = {
  from?: string;
  to?: string;
  timezone?: string;
  compare?: 'previous_period' | 'none';
};
