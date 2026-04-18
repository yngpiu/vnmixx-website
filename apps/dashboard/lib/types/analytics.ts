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
