import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertAnalyticsRangeWithinMaxDays,
  type AnalyticsDateRangeQueryDto,
  type AnalyticsTimeseriesQueryDto,
  type AnalyticsTopCitiesQueryDto,
} from './dto';

type UtcRange = { readonly fromUtc: Date; readonly toUtc: Date };

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseUtcRange(dto: AnalyticsDateRangeQueryDto): UtcRange {
    const fromUtc = new Date(`${dto.from}T00:00:00.000Z`);
    const toUtc = new Date(`${dto.to}T23:59:59.999Z`);
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

  async getOverview(dto: AnalyticsDateRangeQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const createdInPeriod: Prisma.OrderWhereInput = {
      createdAt: { gte: fromUtc, lte: toUtc },
    };
    const updatedInPeriod: Prisma.OrderWhereInput = {
      updatedAt: { gte: fromUtc, lte: toUtc },
    };
    const [
      gmvAgg,
      completedAgg,
      ordersCreatedCount,
      ordersCompletedCount,
      ordersPendingCount,
      ordersInTransitCount,
      cancelledCount,
      returnedCount,
      statusGroups,
      paymentMethodGroups,
      paymentStatusGroups,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          ...createdInPeriod,
          status: { notIn: ['CANCELLED', 'RETURNED'] },
        },
        _sum: { total: true },
      }),
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
      this.prisma.order.groupBy({
        by: ['status'],
        where: createdInPeriod,
        _count: { id: true },
        _sum: { total: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { order: createdInPeriod },
        _count: { id: true },
      }),
      this.prisma.order.groupBy({
        by: ['paymentStatus'],
        where: createdInPeriod,
        _count: { id: true },
      }),
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
    const gmv = gmvAgg._sum.total ?? 0;
    const completedRevenue = completedAgg._sum.total ?? 0;
    const aovCompleted: number | null =
      ordersCompletedCount > 0 ? Math.round(completedRevenue / ordersCompletedCount) : null;
    return {
      period: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
      kpis: {
        gmv,
        completedRevenue,
        ordersCreatedCount,
        ordersCompletedCount,
        ordersPendingCount,
        ordersInTransitCount,
        cancelledCount,
        returnedCount,
        aovCompleted,
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

  async getTimeseries(dto: AnalyticsTimeseriesQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const dayKeys = this.eachUtcDay(fromUtc, toUtc);
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

  async getTopShippingCities(dto: AnalyticsTopCitiesQueryDto) {
    const { fromUtc, toUtc } = this.parseUtcRange(dto);
    const limit = dto.limit ?? 8;
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
