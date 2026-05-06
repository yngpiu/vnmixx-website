import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';
import { DashboardAdminService } from './dashboard-admin.service';

describe('DashboardAdminService', () => {
  let service: DashboardAdminService;
  let prisma: {
    order: Record<string, jest.Mock>;
    customer: Record<string, jest.Mock>;
    product: Record<string, jest.Mock>;
    productReview: Record<string, jest.Mock>;
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      order: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      customer: {
        count: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
      productReview: {
        aggregate: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardAdminService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();
    service = module.get(DashboardAdminService);
  });

  it('should build KPI cards with previous period comparison', async () => {
    prisma.order.aggregate
      .mockResolvedValueOnce({ _sum: { total: 1000 }, _count: { _all: 4 } })
      .mockResolvedValueOnce({ _sum: { total: 500 }, _count: { _all: 2 } });
    prisma.customer.count.mockResolvedValueOnce(6).mockResolvedValueOnce(3);
    const result = await service.getKpis({
      from: '2026-01-01',
      to: '2026-01-31',
      compare: 'previous_period',
    });
    expect(result.cards).toHaveLength(4);
    expect(result.cards[0].key).toBe('revenue');
    expect(prisma.order.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: OrderStatus.CANCELLED },
        }),
      }),
    );
  });

  it('should return revenue trend buckets for day group', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ bucket: '2026-01-01', value: BigInt(1000) }]);
    prisma.$queryRaw.mockResolvedValueOnce([{ bucket: '2025-12-31', value: BigInt(700) }]);
    const result = await service.getRevenueTrend({
      from: '2026-01-01',
      to: '2026-01-01',
      groupBy: 'day',
    });
    expect(result.buckets).toEqual([
      {
        bucket: '2026-01-01',
        value: 1000,
        previousValue: 700,
      },
    ]);
  });

  it('should return order status distribution sorted by count', async () => {
    prisma.order.groupBy.mockResolvedValue([
      { status: 'DELIVERED', _count: { _all: 3 } },
      { status: 'CANCELLED', _count: { _all: 1 } },
    ]);
    const result = await service.getOrderStatusDistribution({
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(result.totalOrders).toBe(4);
    expect(result.segments[0].status).toBe('DELIVERED');
    expect(result.segments[0].percentage).toBe(75);
  });

  it('should return top products and category revenue', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          product_id: 1,
          product_name: 'Product A',
          sold_quantity: BigInt(10),
          revenue: BigInt(500000),
          thumbnail_url: 'https://img/a',
        },
      ])
      .mockResolvedValueOnce([{ category_id: 2, category_name: 'Shoes', revenue: BigInt(200000) }]);
    const topProducts = await service.getTopProducts({ metric: 'revenue', limit: 3 });
    const categories = await service.getCategoryRevenue({ limit: 3 });
    expect(topProducts.items[0].soldQuantity).toBe(10);
    expect(categories.segments[0].percentage).toBe(100);
  });

  it('should return summary metrics and recent orders', async () => {
    prisma.order.count.mockResolvedValueOnce(20).mockResolvedValueOnce(10);
    prisma.productReview.aggregate.mockResolvedValue({ _avg: { rating: 4.25 } });
    prisma.product.count.mockResolvedValue(100);
    prisma.customer.count.mockResolvedValue(50);
    prisma.order.findMany.mockResolvedValue([
      {
        orderCode: 'DH001',
        createdAt: new Date(),
        total: 350000,
        status: 'PROCESSING',
        customer: { fullName: 'Jane' },
      },
    ]);
    const summary = await service.getSummaryMetrics({
      from: '2026-01-01',
      to: '2026-01-31',
      compare: 'none',
    });
    const recent = await service.getRecentOrders({ limit: 1 });
    expect(summary.metrics).toHaveLength(5);
    expect(summary.metrics[0].value).toBe(20);
    expect(recent.items[0].orderCode).toBe('DH001');
  });

  it('should build month and year revenue buckets', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ bucket: '2026-01', value: BigInt(100) }]);
    prisma.$queryRaw.mockResolvedValueOnce([{ bucket: '2025-12', value: BigInt(50) }]);
    const monthResult = await service.getRevenueTrend({
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: 'month',
    });
    expect(monthResult.buckets[0].bucket).toBe('2026-01');
    prisma.$queryRaw.mockResolvedValueOnce([{ bucket: '2026', value: BigInt(1000) }]);
    prisma.$queryRaw.mockResolvedValueOnce([{ bucket: '2025', value: BigInt(700) }]);
    const yearResult = await service.getRevenueTrend({
      from: '2026-01-01',
      to: '2026-12-31',
      groupBy: 'year',
    });
    expect(yearResult.buckets[0].bucket).toBe('2026');
  });

  it('should support compare none and invalid date fallback', async () => {
    prisma.order.aggregate.mockResolvedValue({ _sum: { total: 0 }, _count: { _all: 0 } });
    prisma.customer.count.mockResolvedValue(0);
    const result = await service.getKpis({
      from: 'invalid-date',
      to: 'invalid-date',
      compare: 'none',
    });
    expect(result.cards).toHaveLength(4);
    expect(result.cards[0].deltaPercent).toBe(0);
  });
});
