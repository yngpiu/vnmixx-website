import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertAnalyticsRangeWithinMaxDays,
  type AnalyticsDateRangeQueryDto,
  type AnalyticsTimeseriesQueryDto,
  type AnalyticsTopCitiesQueryDto,
} from './dto';
import { computeMetricDelta, computeNullableRatioDelta } from './kpi-delta.util';

type UtcRange = { readonly fromUtc: Date; readonly toUtc: Date };

export type AnalyticsKpisRow = {
  gmv: number;
  completedRevenue: number;
  ordersCreatedCount: number;
  ordersCompletedCount: number;
  ordersPendingCount: number;
  ordersInTransitCount: number;
  cancelledCount: number;
  returnedCount: number;
  aovCompleted: number | null;
};

// AnalyticsService: Dịch vụ cung cấp các số liệu thống kê (KPIs) và báo cáo doanh thu.
// Vai trò: Tổng hợp dữ liệu từ đơn hàng, sản phẩm, đánh giá để phục vụ dashboard quản trị.
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private isMissingTableError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    return 'code' in error && (error as { code?: string }).code === 'P2021';
  }

  private parseUtcRange(dto: AnalyticsDateRangeQueryDto): UtcRange {
    // 1. Chuyển đổi chuỗi ngày sang đối tượng Date UTC để đảm bảo tính nhất quán múi giờ
    const fromUtc = new Date(`${dto.from}T00:00:00.000Z`);
    const toUtc = new Date(`${dto.to}T23:59:59.999Z`);

    // 2. Kiểm tra tính hợp lệ của khoảng thời gian (không quá giới hạn cho phép)
    const check = assertAnalyticsRangeWithinMaxDays(fromUtc, toUtc);
    if (!check.ok) {
      throw new BadRequestException(check.message);
    }
    return { fromUtc, toUtc };
  }

  private eachUtcDay(fromUtc: Date, toUtc: Date): string[] {
    const keys: string[] = [];
    const cursor = new Date(
      Date.UTC(fromUtc.getUTCFullYear(), fromUtc.getUTCMonth(), fromUtc.getUTCDate()),
    );
    const endDay = new Date(
      Date.UTC(toUtc.getUTCFullYear(), toUtc.getUTCMonth(), toUtc.getUTCDate()),
    );
    while (cursor.getTime() <= endDay.getTime()) {
      const y = cursor.getUTCFullYear();
      const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
      const d = String(cursor.getUTCDate()).padStart(2, '0');
      keys.push(`${y}-${m}-${d}`);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return keys;
  }

  private getComparisonPeriod(fromUtc: Date, toUtc: Date): UtcRange {
    // 1. Tính toán số lượng ngày trong kỳ hiện tại
    const numDays = this.eachUtcDay(fromUtc, toUtc).length;
    const startOfFrom = new Date(
      Date.UTC(fromUtc.getUTCFullYear(), fromUtc.getUTCMonth(), fromUtc.getUTCDate()),
    );

    // 2. Xác định mốc kết thúc của kỳ trước (ngay trước ngày bắt đầu kỳ hiện tại)
    const prevToUtc = new Date(startOfFrom.getTime() - 1);

    // 3. Lùi lại đúng số lượng ngày để xác định mốc bắt đầu của kỳ trước
    const prevFromUtc = new Date(startOfFrom);
    prevFromUtc.setUTCDate(prevFromUtc.getUTCDate() - numDays);
    prevFromUtc.setUTCHours(0, 0, 0, 0);

    return { fromUtc: prevFromUtc, toUtc: prevToUtc };
  }

  private async fetchKpisForRange(fromUtc: Date, toUtc: Date): Promise<AnalyticsKpisRow> {
    const createdInPeriod: Prisma.OrderWhereInput = {
      createdAt: { gte: fromUtc, lte: toUtc },
    };
    const updatedInPeriod: Prisma.OrderWhereInput = {
      updatedAt: { gte: fromUtc, lte: toUtc },
    };

    // Truy vấn song song nhiều chỉ số để tối ưu hiệu năng truy xuất DB
    const [
      gmvAgg,
      completedAgg,
      ordersCreatedCount,
      ordersCompletedCount,
      ordersPendingCount,
      ordersInTransitCount,
      cancelledCount,
      returnedCount,
    ] = await Promise.all([
      // Tính GMV (không tính đơn hủy/trả)
      this.prisma.order.aggregate({
        where: {
          ...createdInPeriod,
          status: { notIn: ['CANCELLED', 'RETURNED'] },
        },
        _sum: { total: true },
      }),
      // Doanh thu hoàn thành (đã giao thành công)
      this.prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          ...updatedInPeriod,
        },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: createdInPeriod }),
      this.prisma.order.count({
        where: { status: 'DELIVERED', ...updatedInPeriod },
      }),
      this.prisma.order.count({
        where: { status: 'PENDING', ...createdInPeriod },
      }),
      this.prisma.order.count({
        where: { status: 'SHIPPED', ...createdInPeriod },
      }),
      this.prisma.order.count({
        where: { status: 'CANCELLED', ...updatedInPeriod },
      }),
      this.prisma.order.count({
        where: { status: 'RETURNED', ...updatedInPeriod },
      }),
    ]);
    const gmv = gmvAgg._sum.total ?? 0;
    const completedRevenue = completedAgg._sum.total ?? 0;

    // Tính giá trị đơn hàng trung bình (AOV) cho các đơn hoàn thành
    const aovCompleted: number | null =
      ordersCompletedCount > 0 ? Math.round(completedRevenue / ordersCompletedCount) : null;

    return {
      gmv,
      completedRevenue,
      ordersCreatedCount,
      ordersCompletedCount,
      ordersPendingCount,
      ordersInTransitCount,
      cancelledCount,
      returnedCount,
      aovCompleted,
    };
  }

  private buildKpiDeltas(current: AnalyticsKpisRow, previous: AnalyticsKpisRow) {
    const metric = (c: number, p: number, higherIsBetter: boolean) => {
      const { deltaPercent, trendDirection } = computeMetricDelta(c, p);
      return { current: c, previous: p, deltaPercent, trendDirection, higherIsBetter };
    };
    const aov = computeNullableRatioDelta(current.aovCompleted, previous.aovCompleted);
    return {
      gmv: metric(current.gmv, previous.gmv, true),
      completedRevenue: metric(current.completedRevenue, previous.completedRevenue, true),
      ordersCreatedCount: metric(current.ordersCreatedCount, previous.ordersCreatedCount, true),
      ordersCompletedCount: metric(
        current.ordersCompletedCount,
        previous.ordersCompletedCount,
        true,
      ),
      ordersPendingCount: metric(current.ordersPendingCount, previous.ordersPendingCount, false),
      ordersInTransitCount: metric(
        current.ordersInTransitCount,
        previous.ordersInTransitCount,
        true,
      ),
      cancelledCount: metric(current.cancelledCount, previous.cancelledCount, false),
      returnedCount: metric(current.returnedCount, previous.returnedCount, false),
      aovCompleted: {
        current: current.aovCompleted,
        previous: previous.aovCompleted,
        deltaPercent: aov.deltaPercent,
        trendDirection: aov.trendDirection,
        higherIsBetter: true,
      },
    };
  }

  // Lấy KPIs quan trọng kèm theo so sánh với kỳ trước (Delta).
  // GMV: Tổng giá trị đơn hàng được tạo (không bao gồm đơn hủy/trả).
  // Completed Revenue: Doanh thu thực tế từ các đơn đã giao thành công.
  // Logic: Tính toán số liệu cho kỳ hiện tại và kỳ trước đó có cùng số lượng ngày, sau đó tính % tăng trưởng.
  async getKpisWithDelta(dto: AnalyticsDateRangeQueryDto) {
    // 1. Xử lý và kiểm tra khoảng thời gian đầu vào
    const { fromUtc, toUtc } = this.parseUtcRange(dto);

    // 2. Xác định kỳ so sánh tương ứng ở quá khứ
    const { fromUtc: prevFrom, toUtc: prevTo } = this.getComparisonPeriod(fromUtc, toUtc);

    // 3. Lấy dữ liệu KPI cho cả hai kỳ
    const [kpis, previousKpis] = await Promise.all([
      this.fetchKpisForRange(fromUtc, toUtc),
      this.fetchKpisForRange(prevFrom, prevTo),
    ]);

    // 4. Tổng hợp và tính toán mức độ tăng trưởng (deltas)
    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      comparisonPeriod: { from: prevFrom.toISOString(), to: prevTo.toISOString() },
      kpis,
      previousKpis,
      deltas: this.buildKpiDeltas(kpis, previousKpis),
    };
  }

  // Lấy tổng quan hoạt động kinh doanh.
  // Bao gồm: KPIs chính, tỷ lệ trạng thái đơn hàng, cơ cấu phương thức thanh toán và các đơn hàng cần xử lý ngay.
  async getOverview(dto: AnalyticsDateRangeQueryDto) {
    // 1. Phân tích khoảng thời gian yêu cầu
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const createdInPeriod: Prisma.OrderWhereInput = {
      createdAt: { gte: fromUtc, lte: toUtc },
    };

    // 2. Truy vấn đồng thời các nhóm dữ liệu tổng quan để tối ưu performance
    const [kpis, statusGroups, paymentMethodGroups, paymentStatusGroups, recentOrders] =
      await Promise.all([
        this.fetchKpisForRange(fromUtc, toUtc),
        // Thống kê theo trạng thái đơn hàng
        this.prisma.order.groupBy({
          by: ['status'],
          where: createdInPeriod,
          _count: { id: true },
          _sum: { total: true },
        }),
        // Thống kê theo phương thức thanh toán
        this.prisma.payment.groupBy({
          by: ['method'],
          where: { order: createdInPeriod },
          _count: { id: true },
        }),
        // Thống kê theo trạng thái thanh toán
        this.prisma.order.groupBy({
          by: ['paymentStatus'],
          where: createdInPeriod,
          _count: { id: true },
        }),
        // Lấy danh sách các đơn hàng mới nhất cần chú ý xử lý
        this.prisma.order.findMany({
          where: {
            ...createdInPeriod,
            OR: [
              { status: 'PENDING' },
              {
                payments: {
                  some: { method: 'BANK_TRANSFER', status: { not: 'SUCCESS' } },
                },
              },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: {
            orderCode: true,
            status: true,
            paymentStatus: true,
            total: true,
            createdAt: true,
            customer: { select: { fullName: true } },
          },
        }),
      ]);

    // 3. Chuẩn hóa dữ liệu trả về cho frontend
    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      kpis: {
        gmv: kpis.gmv,
        completedRevenue: kpis.completedRevenue,
        ordersCreatedCount: kpis.ordersCreatedCount,
        ordersCompletedCount: kpis.ordersCompletedCount,
        ordersPendingCount: kpis.ordersPendingCount,
        ordersInTransitCount: kpis.ordersInTransitCount,
        cancelledCount: kpis.cancelledCount,
        returnedCount: kpis.returnedCount,
        aovCompleted: kpis.aovCompleted,
      },
      statusBreakdown: statusGroups.map((row) => ({
        status: row.status,
        count: row._count.id,
        gmv: row._sum.total ?? 0,
      })),
      paymentMethodMix: paymentMethodGroups.map((row) => ({
        method: row.method,
        orderCount: row._count.id,
      })),
      paymentStatusMix: paymentStatusGroups.map((row) => ({
        paymentStatus: row.paymentStatus,
        count: row._count.id,
      })),
      recentOrdersNeedingAction: recentOrders.map((o) => ({
        orderCode: o.orderCode,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: o.total,
        createdAt: o.createdAt,
        customerFullName: o.customer.fullName,
      })),
    };
  }

  async getStatusBreakdownOnly(dto: AnalyticsDateRangeQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const createdInPeriod: Prisma.OrderWhereInput = {
      createdAt: { gte: fromUtc, lte: toUtc },
    };
    const statusGroups = await this.prisma.order.groupBy({
      by: ['status'],
      where: createdInPeriod,
      _count: { id: true },
      _sum: { total: true },
    });
    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      statusBreakdown: statusGroups.map((row) => ({
        status: row.status,
        count: row._count.id,
        gmv: row._sum.total ?? 0,
      })),
    };
  }

  async getPaymentMethodMixOnly(dto: AnalyticsDateRangeQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const createdInPeriod: Prisma.OrderWhereInput = {
      createdAt: { gte: fromUtc, lte: toUtc },
    };
    const paymentMethodGroups = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { order: createdInPeriod },
      _count: { id: true },
    });
    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      paymentMethodMix: paymentMethodGroups.map((row) => ({
        method: row.method,
        orderCount: row._count.id,
      })),
    };
  }

  async getPaymentStatusMixOnly(dto: AnalyticsDateRangeQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const createdInPeriod: Prisma.OrderWhereInput = {
      createdAt: { gte: fromUtc, lte: toUtc },
    };
    const paymentStatusGroups = await this.prisma.order.groupBy({
      by: ['paymentStatus'],
      where: createdInPeriod,
      _count: { id: true },
    });
    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      paymentStatusMix: paymentStatusGroups.map((row) => ({
        paymentStatus: row.paymentStatus,
        count: row._count.id,
      })),
    };
  }

  async getPendingOrdersOnly(dto: AnalyticsDateRangeQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const createdInPeriod: Prisma.OrderWhereInput = {
      createdAt: { gte: fromUtc, lte: toUtc },
    };
    const recentOrders = await this.prisma.order.findMany({
      where: {
        ...createdInPeriod,
        OR: [
          { status: 'PENDING' },
          {
            payments: {
              some: { method: 'BANK_TRANSFER', status: { not: 'SUCCESS' } },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        orderCode: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        customer: { select: { fullName: true } },
      },
    });
    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      recentOrdersNeedingAction: recentOrders.map((o) => ({
        orderCode: o.orderCode,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: o.total,
        createdAt: o.createdAt,
        customerFullName: o.customer.fullName,
      })),
    };
  }

  // Thống kê Top sản phẩm bán chạy theo doanh thu.
  async getTopProducts(dto: AnalyticsDateRangeQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);

    // 1. Nhóm và tính tổng theo sản phẩm để tìm ra các sản phẩm mang lại doanh thu cao nhất
    const rows = await this.prisma.orderItem.groupBy({
      by: ['productName'],
      where: {
        order: {
          createdAt: { gte: fromUtc, lte: toUtc },
          status: { notIn: ['CANCELLED', 'RETURNED'] },
        },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 10,
    });

    // 2. Chuyển đổi kết quả sang dạng DTO dễ sử dụng
    const products = rows.map((row) => ({
      productName: row.productName,
      unitsSold: row._sum.quantity ?? 0,
      revenue: row._sum.subtotal ?? 0,
    }));

    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      products,
      empty: products.length === 0,
    };
  }

  // Tổng hợp dữ liệu đánh giá (Reviews) trong kỳ.
  // Tính toán điểm trung bình và phân bổ số lượng sao từ 1-5.
  async getReviewsSummary(dto: AnalyticsDateRangeQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const where: Prisma.ProductReviewWhereInput = {
      status: 'VISIBLE',
      createdAt: { gte: fromUtc, lte: toUtc },
    };

    let aggregate: { _count: { id: number }; _avg: { rating: number | null } } = {
      _count: { id: 0 },
      _avg: { rating: null },
    };
    let ratingGroups: Array<{ rating: number; _count: { id: number } }> = [];
    let latestReview: {
      title: string | null;
      content: string | null;
      rating: number;
      createdAt: Date;
      customer: { fullName: string } | null;
    } | null = null;

    try {
      // 1. Lấy tổng hợp điểm trung bình, phân bổ rating và review mới nhất cùng lúc
      [aggregate, ratingGroups, latestReview] = await Promise.all([
        this.prisma.productReview.aggregate({
          where,
          _count: { id: true },
          _avg: { rating: true },
        }),
        this.prisma.productReview.groupBy({
          by: ['rating'],
          where,
          _count: { id: true },
        }),
        this.prisma.productReview.findFirst({
          where,
          orderBy: { createdAt: 'desc' },
          select: {
            title: true,
            content: true,
            rating: true,
            createdAt: true,
            customer: { select: { fullName: true } },
          },
        }),
      ]);
    } catch (error) {
      // Xử lý trường hợp bảng chưa tồn tại (khi chưa chạy migration) để tránh crash API
      if (!this.isMissingTableError(error)) {
        throw error;
      }
      this.logger.warn('Bảng product_reviews chưa tồn tại, trả về thống kê review mặc định.');
    }

    // 2. Tạo bản đồ phân bổ rating từ 1 đến 5 sao
    const ratingMap = new Map<number, number>();
    for (const row of ratingGroups) {
      ratingMap.set(row.rating, row._count.id);
    }
    const ratingBreakdown = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: ratingMap.get(rating) ?? 0,
    }));

    // 3. Chuẩn bị dữ liệu hiển thị cho review mới nhất
    const latestReviewDto =
      latestReview === null
        ? null
        : {
            averageRating: Number(latestReview.rating),
            title: latestReview.title ?? 'Đánh giá mới nhất',
            content: latestReview.content ?? 'Người dùng không để lại nhận xét chi tiết.',
            customerDisplayName: latestReview.customer?.fullName ?? 'Khách ẩn danh',
            isVerifiedPurchase: true,
            createdAt: latestReview.createdAt,
          };

    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      averageRating: Math.round((Number(aggregate._avg.rating ?? 0) + Number.EPSILON) * 10) / 10,
      totalReviews: aggregate._count.id,
      ratingBreakdown,
      latestReview: latestReviewDto,
    };
  }

  // Biểu đồ thời gian (Timeseries) cho doanh thu và số lượng đơn hàng hàng ngày.
  async getTimeseries(dto: AnalyticsTimeseriesQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const dayKeys = this.eachUtcDay(fromUtc, toUtc);

    // 1. Truy vấn raw SQL để tận dụng hàm DATE_FORMAT của DB giúp gom nhóm theo ngày hiệu quả hơn
    const gmvRows = await this.prisma.$queryRaw<
      { bucketDate: string; gmv: bigint; ordersCreated: bigint }[]
    >(Prisma.sql`
      SELECT DATE_FORMAT(o.created_at, '%Y-%m-%d') AS bucketDate,
             COALESCE(SUM(o.total), 0) AS gmv,
             COUNT(*) AS ordersCreated
      FROM orders o
      WHERE o.created_at >= ${fromUtc}
        AND o.created_at <= ${toUtc}
        AND o.status NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
      ORDER BY bucketDate ASC
    `);

    // 2. Lấy số lượng đơn hàng hoàn thành theo ngày (dựa trên thời điểm cập nhật trạng thái)
    const completedRows = await this.prisma.$queryRaw<
      { bucketDate: string; ordersCompleted: bigint }[]
    >(Prisma.sql`
      SELECT DATE_FORMAT(o.updated_at, '%Y-%m-%d') AS bucketDate,
             COUNT(*) AS ordersCompleted
      FROM orders o
      WHERE o.updated_at >= ${fromUtc}
        AND o.updated_at <= ${toUtc}
        AND o.status = 'DELIVERED'
      GROUP BY DATE_FORMAT(o.updated_at, '%Y-%m-%d')
      ORDER BY bucketDate ASC
    `);

    // 3. Lấy số lượng đơn hàng bị hủy theo ngày
    const cancelledRows = await this.prisma.$queryRaw<
      { bucketDate: string; cancelled: bigint }[]
    >(Prisma.sql`
      SELECT DATE_FORMAT(o.updated_at, '%Y-%m-%d') AS bucketDate,
             COUNT(*) AS cancelled
      FROM orders o
      WHERE o.updated_at >= ${fromUtc}
        AND o.updated_at <= ${toUtc}
        AND o.status = 'CANCELLED'
      GROUP BY DATE_FORMAT(o.updated_at, '%Y-%m-%d')
      ORDER BY bucketDate ASC
    `);

    // 4. Map kết quả vào các bản đồ (Map) để tối ưu việc tìm kiếm khi trộn dữ liệu
    const gmvMap = new Map<string, { gmv: number; ordersCreated: number }>();
    for (const row of gmvRows) {
      gmvMap.set(row.bucketDate, {
        gmv: Number(row.gmv),
        ordersCreated: Number(row.ordersCreated),
      });
    }
    const completedMap = new Map<string, number>();
    for (const row of completedRows) {
      completedMap.set(row.bucketDate, Number(row.ordersCompleted));
    }
    const cancelledMap = new Map<string, number>();
    for (const row of cancelledRows) {
      cancelledMap.set(row.bucketDate, Number(row.cancelled));
    }

    // 5. Trộn dữ liệu từ các nguồn khác nhau vào mảng kết quả cuối cùng theo từng ngày
    const data = dayKeys.map((bucketDate) => {
      const g = gmvMap.get(bucketDate);
      return {
        bucketDate,
        gmv: g?.gmv ?? 0,
        ordersCreated: g?.ordersCreated ?? 0,
        ordersCompleted: completedMap.get(bucketDate) ?? 0,
        cancelled: cancelledMap.get(bucketDate) ?? 0,
      };
    });

    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      data,
    };
  }

  // Top các thành phố có doanh thu và số lượng đơn hàng cao nhất.
  async getTopShippingCities(dto: AnalyticsTopCitiesQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const limit = dto.limit ?? 8;

    // 1. Thống kê theo địa chỉ thành phố giao hàng
    const rows = await this.prisma.order.groupBy({
      by: ['shippingCity'],
      where: {
        createdAt: { gte: fromUtc, lte: toUtc },
        status: { notIn: ['CANCELLED', 'RETURNED'] },
      },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    // 2. Trả về kết quả phân tích thị trường theo khu vực
    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      cities: rows.map((row) => ({
        city: row.shippingCity,
        gmv: row._sum.total ?? 0,
        orderCount: row._count.id,
      })),
    };
  }
}
