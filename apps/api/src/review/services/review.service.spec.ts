import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewVisibility } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';
import { ReviewRepository } from '../repositories/review.repository';
import { ReviewService } from './review.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let repo: any;
  let prisma: any;

  beforeEach(async () => {
    repo = {
      findByProductCustomerAndOrderItem: jest.fn(),
      create: jest.fn(),
      countReviews: jest.fn(),
      findAdminReviews: jest.fn(),
      findById: jest.fn(),
      exists: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    prisma = {
      product: {
        findUnique: jest.fn(),
      },
      orderItem: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: ReviewRepository,
          useValue: repo,
        },
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
    const dto = { orderItemId: 101, rating: 5, content: 'Great product' };

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
      repo.findByProductCustomerAndOrderItem.mockResolvedValue({ id: 1 });

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
      repo.findByProductCustomerAndOrderItem.mockResolvedValue(null);
      prisma.orderItem.findFirst.mockResolvedValue(null);

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
      repo.findByProductCustomerAndOrderItem.mockResolvedValue(null);
      prisma.orderItem.findFirst.mockResolvedValue({ id: dto.orderItemId });
      const dtoWithOptionals = { ...dto, content: undefined };

      await service.createProductReview(customerId, productId, dtoWithOptionals as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          customerId,
          orderItemId: dto.orderItemId,
          rating: dto.rating,
          title: null,
          content: null,
          status: ReviewVisibility.VISIBLE,
        }),
      );
    });
  });

  describe('getAdminReviews', () => {
    it('should return paginated reviews with default values', async () => {
      const query = {};
      repo.countReviews.mockResolvedValue(1);
      repo.findAdminReviews.mockResolvedValue([
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
      repo.countReviews.mockResolvedValue(0);
      repo.findAdminReviews.mockResolvedValue([]);

      await service.getAdminReviews(query);

      expect(repo.countReviews).toHaveBeenCalledWith({});
    });

    it('should handle search keyword and filters', async () => {
      const query = {
        page: 2,
        pageSize: 5,
        keyword: 'test',
        visibility: 'hidden' as any,
        customerId: 10,
      };
      repo.countReviews.mockResolvedValue(0);
      repo.findAdminReviews.mockResolvedValue([]);

      await service.getAdminReviews(query);

      expect(repo.countReviews).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 10,
          status: ReviewVisibility.HIDDEN,
          OR: expect.any(Array),
        }),
      );
    });
  });

  describe('getAdminReviewDetail', () => {
    it('should throw NotFoundException if review not found', async () => {
      repo.findById.mockResolvedValue(null);
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
      repo.findById.mockResolvedValue(reviewDetail);

      const result = await service.getAdminReviewDetail(1);

      expect(result.id).toBe(1);
      expect(result.productName).toBe('P');
      expect(result.customerName).toBe('Cust');
    });
  });

  describe('updateAdminReviewStatus', () => {
    it('should update status and return detail', async () => {
      repo.exists.mockResolvedValue(true);
      repo.update.mockResolvedValue({});

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
      repo.findById.mockResolvedValue(reviewDetail);

      const result = await service.updateAdminReviewStatus(1, ReviewVisibility.HIDDEN);

      expect(repo.update).toHaveBeenCalledWith(1, { status: ReviewVisibility.HIDDEN });
      expect(result.status).toBe(ReviewVisibility.HIDDEN);
    });

    it('should throw NotFoundException if review not found when updating', async () => {
      repo.exists.mockResolvedValue(false);
      await expect(service.updateAdminReviewStatus(1, ReviewVisibility.HIDDEN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteAdminReview', () => {
    it('should delete review successfully', async () => {
      repo.exists.mockResolvedValue(true);
      repo.delete.mockResolvedValue({});

      await service.deleteAdminReview(1);

      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if review not found when deleting', async () => {
      repo.exists.mockResolvedValue(false);
      await expect(service.deleteAdminReview(1)).rejects.toThrow(NotFoundException);
    });
  });
});
