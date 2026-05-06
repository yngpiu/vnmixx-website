import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

type DateRange = {
  start: Date;
  end: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
};

type MetricTrend = 'up' | 'down' | 'flat';

type DashboardKpiCard = {
  key: string;
  label: string;
  value: number;
  deltaPercent: number;
  trend: MetricTrend;
};

type TrendBucket = {
  bucket: string;
  value: number;
  previousValue: number;
};

type StatusSegment = {
  status: string;
  label: string;
  value: number;
  percentage: number;
};

type TopProductItem = {
  productId: number;
  productName: string;
  soldQuantity: number;
  revenue: number;
  thumbnailUrl: string | null;
};

type CategoryRevenueSegment = {
  categoryId: number;
  categoryName: string;
  revenue: number;
  percentage: number;
};

type SummaryMetric = {
  key: string;
  label: string;
  value: number;
  deltaPercent: number;
  trend: MetricTrend;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  AWAITING_SHIPMENT: 'Chờ giao',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Hoàn trả',
};

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

@Injectable()
export class DashboardAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(params: {
    from?: string;
    to?: string;
    timezone?: string;
    compare?: 'previous_period' | 'none';
  }): Promise<{ cards: DashboardKpiCard[] }> {
    const range = this.resolveDateRange(params);
    const [current, previous] = await Promise.all([
      this.collectKpiTotals(range.start, range.end),
      range.previousStart && range.previousEnd
        ? this.collectKpiTotals(range.previousStart, range.previousEnd)
        : null,
    ]);
    const previousTotals = previous ?? {
      revenue: 0,
      orders: 0,
      newCustomers: 0,
      averageOrderValue: 0,
    };
    return {
      cards: [
        this.buildMetricCard('revenue', 'Doanh thu', current.revenue, previousTotals.revenue),
        this.buildMetricCard('orders', 'Đơn hàng', current.orders, previousTotals.orders),
        this.buildMetricCard(
          'newCustomers',
          'Khách hàng mới',
          current.newCustomers,
          previousTotals.newCustomers,
        ),
        this.buildMetricCard(
          'aov',
          'Giá trị đơn trung bình',
          current.averageOrderValue,
          previousTotals.averageOrderValue,
        ),
      ],
    };
  }

  async getRevenueTrend(params: {
    from?: string;
    to?: string;
    timezone?: string;
    compare?: 'previous_period' | 'none';
    groupBy?: 'day' | 'month' | 'year';
  }): Promise<{ buckets: TrendBucket[] }> {
    const range = this.resolveDateRange(params);
    const groupBy = params.groupBy ?? 'day';
    const currentRows = await this.aggregateRevenueTrend(range.start, range.end, groupBy);
    const previousRows =
      range.previousStart && range.previousEnd
        ? await this.aggregateRevenueTrend(range.previousStart, range.previousEnd, groupBy)
        : [];
    return {
      buckets: this.mergeTrendBuckets(range, groupBy, currentRows, previousRows),
    };
  }

  async getOrderStatusDistribution(params: {
    from?: string;
    to?: string;
    timezone?: string;
  }): Promise<{ totalOrders: number; segments: StatusSegment[] }> {
    const range = this.resolveDateRange(params);
    const rows = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: range.start, lte: range.end },
      },
      _count: { _all: true },
    });
    const totalOrders = rows.reduce((total, row) => total + row._count._all, 0);
    const segments = rows
      .map((row) => ({
        status: row.status,
        label: STATUS_LABELS[row.status] ?? row.status,
        value: row._count._all,
        percentage:
          totalOrders > 0 ? Number(((row._count._all * 100) / totalOrders).toFixed(1)) : 0,
      }))
      .sort((left, right) => right.value - left.value);
    return { totalOrders, segments };
  }

  async getTopProducts(params: {
    from?: string;
    to?: string;
    timezone?: string;
    limit?: number;
    metric?: 'quantity' | 'revenue';
  }): Promise<{ items: TopProductItem[] }> {
    const range = this.resolveDateRange(params);
    const limit = params.limit ?? 5;
    const metric = params.metric ?? 'quantity';
    const metricSql =
      metric === 'revenue' ? Prisma.sql`SUM(oi.subtotal) DESC` : Prisma.sql`SUM(oi.quantity) DESC`;
    const rows = await this.prisma.$queryRaw<
      Array<{
        product_id: number;
        product_name: string;
        sold_quantity: bigint;
        revenue: bigint;
        thumbnail_url: string | null;
      }>
    >(Prisma.sql`
      SELECT
        pv.product_id AS product_id,
        MAX(oi.product_name) AS product_name,
        SUM(oi.quantity) AS sold_quantity,
        SUM(oi.subtotal) AS revenue,
        (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = pv.product_id
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS thumbnail_url
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE o.created_at BETWEEN ${range.start} AND ${range.end}
        AND o.status <> 'CANCELLED'
      GROUP BY pv.product_id
      ORDER BY ${metricSql}
      LIMIT ${limit}
    `);
    return {
      items: rows.map((row) => ({
        productId: Number(row.product_id),
        productName: row.product_name,
        soldQuantity: Number(row.sold_quantity ?? 0),
        revenue: Number(row.revenue ?? 0),
        thumbnailUrl: row.thumbnail_url,
      })),
    };
  }

  async getCategoryRevenue(params: {
    from?: string;
    to?: string;
    timezone?: string;
    limit?: number;
  }): Promise<{ segments: CategoryRevenueSegment[] }> {
    const range = this.resolveDateRange(params);
    const limit = params.limit ?? 5;
    const rows = await this.prisma.$queryRaw<
      Array<{ category_id: number; category_name: string; revenue: bigint }>
    >(Prisma.sql`
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        SUM(oi.subtotal) AS revenue
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN product_variants pv ON pv.id = oi.variant_id
      INNER JOIN (
        SELECT product_id, MIN(category_id) AS category_id
        FROM product_categories
        GROUP BY product_id
      ) pc ON pc.product_id = pv.product_id
      INNER JOIN categories c ON c.id = pc.category_id
      WHERE o.created_at BETWEEN ${range.start} AND ${range.end}
        AND o.status <> 'CANCELLED'
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `);
    const totalRevenue = rows.reduce((total, row) => total + Number(row.revenue ?? 0), 0);
    return {
      segments: rows.map((row) => {
        const revenue = Number(row.revenue ?? 0);
        return {
          categoryId: Number(row.category_id),
          categoryName: row.category_name,
          revenue,
          percentage: totalRevenue > 0 ? Number(((revenue * 100) / totalRevenue).toFixed(1)) : 0,
        };
      }),
    };
  }

  async getSummaryMetrics(params: {
    from?: string;
    to?: string;
    timezone?: string;
    compare?: 'previous_period' | 'none';
  }): Promise<{ metrics: SummaryMetric[] }> {
    const range = this.resolveDateRange(params);
    const [current, previous] = await Promise.all([
      this.collectSummaryTotals(range.start, range.end),
      range.previousStart && range.previousEnd
        ? this.collectSummaryTotals(range.previousStart, range.previousEnd)
        : null,
    ]);
    const previousTotals = previous ?? {
      totalOrders: 0,
      conversionRate: 0,
      averageRating: 0,
      totalProducts: 0,
      totalCustomers: 0,
    };
    return {
      metrics: [
        this.buildMetricCard(
          'totalOrders',
          'Tổng đơn hàng',
          current.totalOrders,
          previousTotals.totalOrders,
        ),
        this.buildMetricCard(
          'conversionRate',
          'Tỷ lệ chuyển đổi',
          current.conversionRate,
          previousTotals.conversionRate,
        ),
        this.buildMetricCard(
          'averageRating',
          'Đánh giá trung bình',
          current.averageRating,
          previousTotals.averageRating,
        ),
        this.buildMetricCard(
          'totalProducts',
          'Sản phẩm',
          current.totalProducts,
          previousTotals.totalProducts,
        ),
        this.buildMetricCard(
          'totalCustomers',
          'Tổng khách hàng',
          current.totalCustomers,
          previousTotals.totalCustomers,
        ),
      ],
    };
  }

  async getRecentOrders(params: { limit?: number }): Promise<{
    items: Array<{
      orderCode: string;
      customerName: string;
      createdAt: Date;
      totalAmount: number;
      status: string;
    }>;
  }> {
    const limit = params.limit ?? 5;
    const rows = await this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        orderCode: true,
        createdAt: true,
        total: true,
        status: true,
        customer: { select: { fullName: true } },
      },
    });
    return {
      items: rows.map((row) => ({
        orderCode: row.orderCode,
        customerName: row.customer.fullName,
        createdAt: row.createdAt,
        totalAmount: row.total,
        status: row.status,
      })),
    };
  }

  private resolveDateRange(params: {
    from?: string;
    to?: string;
    compare?: 'previous_period' | 'none';
    timezone?: string;
  }): DateRange {
    const _timezone = params.timezone ?? DEFAULT_TIMEZONE;
    void _timezone;
    const now = new Date();
    const end = params.to ? this.parseDate(params.to, true) : this.getEndOfDay(now);
    const start = params.from ? this.parseDate(params.from, false) : this.shiftDate(end, -30);
    if ((params.compare ?? 'previous_period') === 'none') {
      return { start, end, previousStart: null, previousEnd: null };
    }
    const duration = end.getTime() - start.getTime() + 1;
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration + 1);
    return { start, end, previousStart, previousEnd };
  }

  private parseDate(input: string, isEndOfDay: boolean): Date {
    const shortDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (shortDatePattern.test(input)) {
      const time = isEndOfDay ? '23:59:59.999' : '00:00:00.000';
      const parsed = new Date(`${input}T${time}+07:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    if (isEndOfDay) {
      return this.getEndOfDay(parsed);
    }
    return this.getStartOfDay(parsed);
  }

  private shiftDate(date: Date, dayOffset: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + dayOffset);
    return this.getStartOfDay(next);
  }

  private getStartOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private getEndOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private async collectKpiTotals(
    start: Date,
    end: Date,
  ): Promise<{ revenue: number; orders: number; newCustomers: number; averageOrderValue: number }> {
    const [orderSummary, newCustomers] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.customer.count({
        where: {
          createdAt: { gte: start, lte: end },
          deletedAt: null,
        },
      }),
    ]);
    const revenue = orderSummary._sum.total ?? 0;
    const orders = orderSummary._count._all;
    return {
      revenue,
      orders,
      newCustomers,
      averageOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
    };
  }

  private async collectSummaryTotals(
    start: Date,
    end: Date,
  ): Promise<{
    totalOrders: number;
    conversionRate: number;
    averageRating: number;
    totalProducts: number;
    totalCustomers: number;
  }> {
    const [totalOrders, deliveredOrders, ratingAggregate, totalProducts, totalCustomers] =
      await Promise.all([
        this.prisma.order.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
        this.prisma.order.count({
          where: {
            createdAt: { gte: start, lte: end },
            status: 'DELIVERED',
          },
        }),
        this.prisma.productReview.aggregate({
          where: { createdAt: { gte: start, lte: end } },
          _avg: { rating: true },
        }),
        this.prisma.product.count({ where: { deletedAt: null } }),
        this.prisma.customer.count({ where: { deletedAt: null } }),
      ]);
    return {
      totalOrders,
      conversionRate:
        totalOrders > 0 ? Number(((deliveredOrders * 100) / totalOrders).toFixed(2)) : 0,
      averageRating: Number((ratingAggregate._avg.rating ?? 0).toFixed(2)),
      totalProducts,
      totalCustomers,
    };
  }

  private buildMetricCard(
    key: string,
    label: string,
    value: number,
    previousValue: number,
  ): { key: string; label: string; value: number; deltaPercent: number; trend: MetricTrend } {
    if (previousValue === 0) {
      return {
        key,
        label,
        value,
        deltaPercent: value > 0 ? 100 : 0,
        trend: value > 0 ? 'up' : 'flat',
      };
    }
    const deltaPercent = Number((((value - previousValue) * 100) / previousValue).toFixed(2));
    return {
      key,
      label,
      value,
      deltaPercent,
      trend: deltaPercent > 0 ? 'up' : deltaPercent < 0 ? 'down' : 'flat',
    };
  }

  private async aggregateRevenueTrend(
    start: Date,
    end: Date,
    groupBy: 'day' | 'month' | 'year',
  ): Promise<Array<{ bucket: string; value: number }>> {
    const formatSql =
      groupBy === 'year'
        ? Prisma.raw("'%Y'")
        : groupBy === 'month'
          ? Prisma.raw("'%Y-%m'")
          : Prisma.raw("'%Y-%m-%d'");
    const rows = await this.prisma.$queryRaw<Array<{ bucket: string; value: bigint }>>(Prisma.sql`
      SELECT source.bucket AS bucket, SUM(source.total) AS value
      FROM (
        SELECT DATE_FORMAT(created_at, ${formatSql}) AS bucket, total
        FROM orders
        WHERE created_at BETWEEN ${start} AND ${end}
          AND status <> 'CANCELLED'
      ) AS source
      GROUP BY source.bucket
      ORDER BY bucket ASC
    `);
    return rows.map((row) => ({ bucket: row.bucket, value: Number(row.value ?? 0) }));
  }

  private mergeTrendBuckets(
    range: DateRange,
    groupBy: 'day' | 'month' | 'year',
    currentRows: Array<{ bucket: string; value: number }>,
    previousRows: Array<{ bucket: string; value: number }>,
  ): TrendBucket[] {
    const bucketKeys = this.buildBucketKeys(range.start, range.end, groupBy);
    const currentMap = new Map(currentRows.map((row) => [row.bucket, row.value]));
    const previousMap = new Map(previousRows.map((row) => [row.bucket, row.value]));
    const previousKeys =
      range.previousStart && range.previousEnd
        ? this.buildBucketKeys(range.previousStart, range.previousEnd, groupBy)
        : [];
    return bucketKeys.map((bucket, index) => ({
      bucket,
      value: currentMap.get(bucket) ?? 0,
      previousValue: previousMap.get(previousKeys[index] ?? '') ?? 0,
    }));
  }

  private buildBucketKeys(start: Date, end: Date, groupBy: 'day' | 'month' | 'year'): string[] {
    const keys: string[] = [];
    if (groupBy === 'year') {
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      for (let year = startYear; year <= endYear; year += 1) {
        keys.push(String(year));
      }
      return keys;
    }
    if (groupBy === 'month') {
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cursor <= endMonth) {
        keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return keys;
    }
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cursor <= endDate) {
      keys.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
      );
      cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
  }
}
