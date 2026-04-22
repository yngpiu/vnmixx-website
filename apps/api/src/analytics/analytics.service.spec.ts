import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockPrismaService = {
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    payment: {
      groupBy: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
    productReview: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: 0 } });
    mockPrismaService.order.count.mockResolvedValue(0);
    mockPrismaService.order.groupBy.mockResolvedValue([]);
    mockPrismaService.order.findMany.mockResolvedValue([]);
    mockPrismaService.payment.groupBy.mockResolvedValue([]);
    mockPrismaService.orderItem.groupBy.mockResolvedValue([]);
    mockPrismaService.productReview.aggregate.mockResolvedValue({
      _count: { id: 0 },
      _avg: { rating: 0 },
    });
    mockPrismaService.productReview.groupBy.mockResolvedValue([]);
    mockPrismaService.productReview.findFirst.mockResolvedValue(null);
    mockPrismaService.$queryRaw.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseUtcRange', () => {
    it('should accept valid date range', async () => {
      const result = await service.getKpisWithDelta({ from: '2023-01-01', to: '2023-01-01' });
      expect(result.period.from).toContain('2023-01-01');
      expect(result.period.to).toContain('2023-01-01');
    });

    it('should throw BadRequestException if from > to', async () => {
      await expect(
        service.getKpisWithDelta({ from: '2023-01-10', to: '2023-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getKpisWithDelta', () => {
    it('should return KPIs and deltas', async () => {
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: 1000 } });
      mockPrismaService.order.count.mockResolvedValue(10);

      const result = await service.getKpisWithDelta({ from: '2023-01-01', to: '2023-01-07' });

      expect(result.kpis.gmv).toBe(1000);
      expect(result.deltas).toBeDefined();
      expect(mockPrismaService.order.aggregate).toHaveBeenCalled();
    });
  });

  describe('getOverview', () => {
    it('should return full overview', async () => {
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: 1000 } });
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.order.groupBy.mockResolvedValue([]);
      mockPrismaService.payment.groupBy.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getOverview({ from: '2023-01-01', to: '2023-01-07' });

      expect(result.kpis).toBeDefined();
      expect(result.statusBreakdown).toEqual([]);
      expect(result.recentOrdersNeedingAction).toEqual([]);
    });
  });

  describe('getTopProducts', () => {
    it('should return top products', async () => {
      mockPrismaService.orderItem.groupBy.mockResolvedValue([
        { productName: 'P1', _sum: { quantity: 5, subtotal: 500 } },
      ]);

      const result = await service.getTopProducts({ from: '2023-01-01', to: '2023-01-07' });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].productName).toBe('P1');
    });
  });

  describe('getReviewsSummary', () => {
    it('should return reviews summary', async () => {
      mockPrismaService.productReview.aggregate.mockResolvedValue({
        _count: { id: 5 },
        _avg: { rating: 4.5 },
      });
      mockPrismaService.productReview.groupBy.mockResolvedValue([{ rating: 5, _count: { id: 3 } }]);
      mockPrismaService.productReview.findFirst.mockResolvedValue({
        rating: 5,
        title: 'Great',
        content: 'Loved it',
        createdAt: new Date(),
        customer: { fullName: 'John' },
      });

      const result = await service.getReviewsSummary({ from: '2023-01-01', to: '2023-01-07' });

      expect(result.totalReviews).toBe(5);
      expect(result.averageRating).toBe(4.5);
      expect(result.latestReview?.customerDisplayName).toBe('John');
    });

    it('should handle missing table error (P2021)', async () => {
      mockPrismaService.productReview.aggregate.mockRejectedValue({ code: 'P2021' });
      const result = await service.getReviewsSummary({ from: '2023-01-01', to: '2023-01-07' });
      expect(result.totalReviews).toBe(0);
    });
  });

  describe('getTimeseries', () => {
    it('should return timeseries data', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { bucketDate: '2023-01-01', gmv: BigInt(100), ordersCreated: BigInt(1) },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { bucketDate: '2023-01-01', ordersCompleted: BigInt(1) },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { bucketDate: '2023-01-01', cancelled: BigInt(0) },
      ]);

      const result = await service.getTimeseries({ from: '2023-01-01', to: '2023-01-01' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].bucketDate).toBe('2023-01-01');
      expect(result.data[0].gmv).toBe(100);
    });
  });

  describe('getTopShippingCities', () => {
    it('should return top shipping cities', async () => {
      mockPrismaService.order.groupBy.mockResolvedValue([
        { shippingCity: 'Hanoi', _sum: { total: 1000 }, _count: { id: 5 } },
      ]);
      const result = await service.getTopShippingCities({ from: '2023-01-01', to: '2023-01-07' });
      expect(result.cities[0].city).toBe('Hanoi');
      expect(result.cities[0].gmv).toBe(1000);
    });
  });

  describe('slice endpoints', () => {
    it('should return status breakdown only', async () => {
      mockPrismaService.order.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { id: 2 }, _sum: { total: 200 } },
      ]);

      const result = await service.getStatusBreakdownOnly({ from: '2023-01-01', to: '2023-01-07' });

      expect(result.statusBreakdown).toEqual([{ status: 'PENDING', count: 2, gmv: 200 }]);
    });

    it('should return payment method mix only', async () => {
      mockPrismaService.payment.groupBy.mockResolvedValue([{ method: 'COD', _count: { id: 3 } }]);

      const result = await service.getPaymentMethodMixOnly({
        from: '2023-01-01',
        to: '2023-01-07',
      });

      expect(result.paymentMethodMix).toEqual([{ method: 'COD', orderCount: 3 }]);
    });

    it('should return payment status mix only', async () => {
      mockPrismaService.order.groupBy.mockResolvedValue([
        { paymentStatus: 'PENDING', _count: { id: 4 } },
      ]);

      const result = await service.getPaymentStatusMixOnly({
        from: '2023-01-01',
        to: '2023-01-07',
      });

      expect(result.paymentStatusMix).toEqual([{ paymentStatus: 'PENDING', count: 4 }]);
    });

    it('should return pending orders only', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          orderCode: 'ORD-1',
          status: 'PENDING',
          paymentStatus: 'PENDING',
          total: 100,
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
          customer: { fullName: 'John' },
        },
      ]);

      const result = await service.getPendingOrdersOnly({ from: '2023-01-01', to: '2023-01-07' });

      expect(result.recentOrdersNeedingAction).toHaveLength(1);
      expect(result.recentOrdersNeedingAction[0]).toEqual(
        expect.objectContaining({ orderCode: 'ORD-1', customerFullName: 'John' }),
      );
    });
  });
});
