import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewVisibility } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/services/prisma.service';
import { ReviewService } from './review.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
      },
      productReview: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      orderItem: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProductReview', () => {
    const customerId = 1;
    const productId = 100;
    const dto = { rating: 5, title: 'Good', content: 'Great product' };

    it('should throw NotFoundException if product not found, deleted or inactive', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.createProductReview(customerId, productId, dto)).rejects.toThrow(
        NotFoundException,
      );

      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        deletedAt: new Date(),
        isActive: true,
      });
      await expect(service.createProductReview(customerId, productId, dto)).rejects.toThrow(
        NotFoundException,
      );

      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        deletedAt: null,
        isActive: false,
      });
      await expect(service.createProductReview(customerId, productId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if review already exists', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        deletedAt: null,
        isActive: true,
      });
      prisma.productReview.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.createProductReview(customerId, productId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if product not purchased/delivered', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        deletedAt: null,
        isActive: true,
      });
      prisma.productReview.findUnique.mockResolvedValue(null);
      prisma.orderItem.count.mockResolvedValue(0);

      await expect(service.createProductReview(customerId, productId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create review successfully with optional fields', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        deletedAt: null,
        isActive: true,
      });
      prisma.productReview.findUnique.mockResolvedValue(null);
      prisma.orderItem.count.mockResolvedValue(1);
      const dtoWithOptionals = { ...dto, title: undefined, content: undefined };
      const createdReview = {
        id: 1,
        ...dtoWithOptionals,
        title: null,
        content: null,
        status: ReviewVisibility.VISIBLE,
      };
      prisma.productReview.create.mockResolvedValue(createdReview);

      const result = await service.createProductReview(
        customerId,
        productId,
        dtoWithOptionals as any,
      );

      expect(result.title).toBeNull();
      expect(prisma.productReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: null, content: null }),
        }),
      );
    });
  });

  describe('getAdminReviews', () => {
    it('should return paginated reviews with default values', async () => {
      const query = {};
      prisma.productReview.count.mockResolvedValue(1);
      prisma.productReview.findMany.mockResolvedValue([
        {
          id: 1,
          rating: 5,
          title: null,
          content: null,
          status: ReviewVisibility.VISIBLE,
          createdAt: new Date(),
          product: { name: 'P' },
          customer: null,
        },
      ]);

      const result = await service.getAdminReviews(query as any);

      expect(result.items[0].customerName).toBeNull();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should handle "all" visibility and no keyword', async () => {
      const query = { visibility: 'all' as any };
      prisma.productReview.count.mockResolvedValue(0);
      prisma.productReview.findMany.mockResolvedValue([]);

      await service.getAdminReviews(query);

      expect(prisma.productReview.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should handle search keyword and filters', async () => {
      const query = {
        page: 2,
        pageSize: 5,
        keyword: 'test',
        visibility: 'hidden' as any,
        customerId: 10,
      };
      prisma.productReview.count.mockResolvedValue(0);
      prisma.productReview.findMany.mockResolvedValue([]);

      await service.getAdminReviews(query);

      expect(prisma.productReview.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 10,
            status: ReviewVisibility.HIDDEN,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('getAdminReviewDetail', () => {
    it('should throw NotFoundException if review not found', async () => {
      prisma.productReview.findUnique.mockResolvedValue(null);
      await expect(service.getAdminReviewDetail(1)).rejects.toThrow(NotFoundException);
    });

    it('should return review detail', async () => {
      const reviewDetail = {
        id: 1,
        productId: 100,
        customerId: 1,
        rating: 5,
        title: 'T',
        content: 'C',
        status: ReviewVisibility.VISIBLE,
        createdAt: new Date(),
        updatedAt: new Date(),
        product: { name: 'P' },
        customer: { fullName: 'Cust', email: 'E' },
      };
      prisma.productReview.findUnique.mockResolvedValue(reviewDetail);

      const result = await service.getAdminReviewDetail(1);

      expect(result.id).toBe(1);
      expect(result.productName).toBe('P');
      expect(result.customerName).toBe('Cust');
    });
  });

  describe('updateAdminReviewStatus', () => {
    it('should update status and return detail', async () => {
      prisma.productReview.findUnique.mockResolvedValueOnce({ id: 1 }); // for existence check
      prisma.productReview.update.mockResolvedValue({});

      // for getAdminReviewDetail which is called after update
      const reviewDetail = {
        id: 1,
        productId: 100,
        customerId: 1,
        rating: 5,
        title: 'T',
        content: 'C',
        status: ReviewVisibility.HIDDEN,
        createdAt: new Date(),
        updatedAt: new Date(),
        product: { name: 'P' },
        customer: { fullName: 'Cust', email: 'E' },
      };
      prisma.productReview.findUnique.mockResolvedValueOnce(reviewDetail);

      const result = await service.updateAdminReviewStatus(1, ReviewVisibility.HIDDEN);

      expect(prisma.productReview.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: ReviewVisibility.HIDDEN },
      });
      expect(result.status).toBe(ReviewVisibility.HIDDEN);
    });

    it('should throw NotFoundException if review not found when updating', async () => {
      prisma.productReview.findUnique.mockResolvedValue(null);
      await expect(service.updateAdminReviewStatus(1, ReviewVisibility.HIDDEN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteAdminReview', () => {
    it('should delete review successfully', async () => {
      prisma.productReview.findUnique.mockResolvedValue({ id: 1 });
      prisma.productReview.delete.mockResolvedValue({});

      await service.deleteAdminReview(1);

      expect(prisma.productReview.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if review not found when deleting', async () => {
      prisma.productReview.findUnique.mockResolvedValue(null);
      await expect(service.deleteAdminReview(1)).rejects.toThrow(NotFoundException);
    });
  });
});
