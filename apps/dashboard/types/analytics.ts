/** Khớp `Analytics*ResponseDto` từ API admin analytics. */

export interface AnalyticsPeriod {
  from: string;
  to: string;
}

export interface AnalyticsKpis {
  gmv: number;
  completedRevenue: number;
  ordersCreatedCount: number;
  ordersCompletedCount: number;
  ordersPendingCount: number;
  ordersInTransitCount: number;
  cancelledCount: number;
  returnedCount: number;
  aovCompleted: number | null;
}

export interface AnalyticsStatusBreakdownItem {
  status: string;
  count: number;
  gmv: number;
}

export interface AnalyticsPaymentMethodMixItem {
  method: string;
  orderCount: number;
}

export interface AnalyticsPaymentStatusMixItem {
  paymentStatus: string;
  count: number;
}

export interface AnalyticsRecentOrderNeedingAction {
  orderCode: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  customerFullName: string;
}

export interface AnalyticsOverviewResponse {
  period: AnalyticsPeriod;
  kpis: AnalyticsKpis;
  statusBreakdown: AnalyticsStatusBreakdownItem[];
  paymentMethodMix: AnalyticsPaymentMethodMixItem[];
  paymentStatusMix: AnalyticsPaymentStatusMixItem[];
  recentOrdersNeedingAction: AnalyticsRecentOrderNeedingAction[];
}

export interface AnalyticsTimeseriesPoint {
  bucketDate: string;
  gmv: number;
  ordersCreated: number;
  ordersCompleted: number;
  cancelled: number;
}

export interface AnalyticsTimeseriesResponse {
  period: AnalyticsPeriod;
  data: AnalyticsTimeseriesPoint[];
}

export interface AnalyticsTopCityItem {
  city: string;
  gmv: number;
  orderCount: number;
}

export interface AnalyticsTopShippingCitiesResponse {
  period: AnalyticsPeriod;
  cities: AnalyticsTopCityItem[];
}

export type TrendDirection = 'up' | 'down' | 'flat';

export interface MetricDelta {
  current: number;
  previous: number;
  deltaPercent: number | null;
  trendDirection: TrendDirection;
  higherIsBetter: boolean;
}

export interface NullableMetricDelta {
  current: number | null;
  previous: number | null;
  deltaPercent: number | null;
  trendDirection: TrendDirection;
  higherIsBetter: boolean;
}

export interface AnalyticsKpiDeltas {
  gmv: MetricDelta;
  completedRevenue: MetricDelta;
  ordersCreatedCount: MetricDelta;
  ordersCompletedCount: MetricDelta;
  ordersPendingCount: MetricDelta;
  ordersInTransitCount: MetricDelta;
  cancelledCount: MetricDelta;
  returnedCount: MetricDelta;
  aovCompleted: NullableMetricDelta;
}

export interface AnalyticsKpisWithDeltaResponse {
  period: AnalyticsPeriod;
  comparisonPeriod: AnalyticsPeriod;
  kpis: AnalyticsKpis;
  previousKpis: AnalyticsKpis;
  deltas: AnalyticsKpiDeltas;
}

export interface AnalyticsStatusBreakdownOnlyResponse {
  period: AnalyticsPeriod;
  statusBreakdown: AnalyticsStatusBreakdownItem[];
}

export interface AnalyticsPaymentMethodMixOnlyResponse {
  period: AnalyticsPeriod;
  paymentMethodMix: AnalyticsPaymentMethodMixItem[];
}

export interface AnalyticsPaymentStatusMixOnlyResponse {
  period: AnalyticsPeriod;
  paymentStatusMix: AnalyticsPaymentStatusMixItem[];
}

export interface AnalyticsPendingOrdersOnlyResponse {
  period: AnalyticsPeriod;
  recentOrdersNeedingAction: AnalyticsRecentOrderNeedingAction[];
}

export interface AnalyticsTopProductItem {
  productName: string;
  unitsSold: number;
  revenue: number;
}

export interface AnalyticsTopProductsResponse {
  period: AnalyticsPeriod;
  products: AnalyticsTopProductItem[];
  empty: boolean;
}

export interface AnalyticsReviewRatingBucket {
  rating: number;
  count: number;
}

export interface AnalyticsLatestReview {
  averageRating: number;
  title: string;
  content: string;
  customerDisplayName: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface AnalyticsReviewsSummaryResponse {
  period: AnalyticsPeriod;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: AnalyticsReviewRatingBucket[];
  latestReview: AnalyticsLatestReview | null;
}

export interface AdminReviewListItem {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  status: 'VISIBLE' | 'HIDDEN';
  productName: string;
  customerName: string | null;
  createdAt: string;
}

export interface AdminReviewsListResponse {
  items: AdminReviewListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminReviewDetailResponse {
  id: number;
  productId: number;
  customerId: number | null;
  rating: number;
  title: string | null;
  content: string | null;
  status: 'VISIBLE' | 'HIDDEN';
  productName: string;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}
