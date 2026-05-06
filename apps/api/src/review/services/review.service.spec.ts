import { NotFoundException } from '@nestjs/common';
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
      aggregateVisibleReviewStatsByProductId: jest.fn(),
      findPublicVisibleReviewsByProductId: jest.fn(),
      countVisibleReviewsByStarRating: jest.fn(),
      countReviews: jest.fn(),
      findAdminReviews: jest.fn(),
      findById: jest.fn(),
      exists: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    prisma = {
      product: { findFirst: jest.fn() },
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

  describe('listPublicReviewsByProductId', () => {
    it('should throw when product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.listPublicReviewsByProductId(999, 1, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return paginated public reviews with masked author names', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 1 });
      repo.aggregateVisibleReviewStatsByProductId.mockResolvedValue({
        reviewCount: 2,
        averageRating: 4.5,
      });
      repo.findPublicVisibleReviewsByProductId.mockResolvedValue([
        {
          id: 1,
          rating: 5,
          title: 'Great',
          content: 'Nice',
          createdAt: new Date(),
          customerFullName: 'Nguyen Van A',
        },
        {
          id: 2,
          rating: 4,
          title: null,
          content: null,
          createdAt: new Date(),
          customerFullName: 'An',
        },
      ]);
      repo.countVisibleReviewsByStarRating.mockResolvedValue({
        star1: 0,
        star2: 0,
        star3: 0,
        star4: 1,
        star5: 1,
      });
      const result = await service.listPublicReviewsByProductId(1, 1, 10);
      expect(result.reviewCount).toBe(2);
      expect(result.data[0].authorDisplayName).toBe('Nguyen A.');
      expect(result.data[1].authorDisplayName).toBe('A*');
    });
  });

  describe('listPublicReviewsByProductSlug', () => {
    it('should throw if product slug is missing', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.listPublicReviewsByProductSlug('missing-slug', 1, 10)).rejects.toThrow(
        NotFoundException,
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

  describe('hideAdminReview', () => {
    it('should hide review successfully', async () => {
      repo.exists.mockResolvedValue(true);
      repo.update.mockResolvedValue({});

      await service.hideAdminReview(1);

      expect(repo.update).toHaveBeenCalledWith(1, { status: ReviewVisibility.HIDDEN });
    });

    it('should throw NotFoundException if review not found when hiding', async () => {
      repo.exists.mockResolvedValue(false);
      await expect(service.hideAdminReview(1)).rejects.toThrow(NotFoundException);
    });
  });
});
