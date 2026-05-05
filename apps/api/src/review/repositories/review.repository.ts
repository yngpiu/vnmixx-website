import { Injectable } from '@nestjs/common';
import { Prisma, ReviewVisibility } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface AdminReviewListView {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  status: ReviewVisibility;
  createdAt: Date;
  product: { name: string };
  customer: { fullName: string } | null;
}

export interface AdminReviewDetailView {
  id: number;
  productId: number;
  customerId: number;
  orderItemId: number | null;
  rating: number;
  title: string | null;
  content: string | null;
  status: ReviewVisibility;
  createdAt: Date;
  updatedAt: Date;
  product: { name: string };
  customer: { fullName: string; email: string } | null;
}

export interface PublicProductReviewListItemView {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  createdAt: Date;
  customerFullName: string | null;
}

const ADMIN_REVIEW_LIST_SELECT = {
  id: true,
  rating: true,
  title: true,
  content: true,
  status: true,
  createdAt: true,
  product: { select: { name: true } },
  customer: { select: { fullName: true } },
} as const satisfies Prisma.ProductReviewSelect;

const ADMIN_REVIEW_DETAIL_SELECT = {
  id: true,
  productId: true,
  customerId: true,
  orderItemId: true,
  rating: true,
  title: true,
  content: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  product: { select: { name: true } },
  customer: { select: { fullName: true, email: true } },
} as const satisfies Prisma.ProductReviewSelect;

@Injectable()
// Repository Prisma cho các thao tác với dữ liệu đánh giá sản phẩm.
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy danh sách đánh giá phục vụ quản trị với phân trang và bộ lọc.
  async findAdminReviews(args: {
    where: Prisma.ProductReviewWhereInput;
    skip: number;
    take: number;
  }): Promise<AdminReviewListView[]> {
    const result = await this.prisma.productReview.findMany({
      where: args.where,
      orderBy: { createdAt: 'desc' },
      skip: args.skip,
      take: args.take,
      select: ADMIN_REVIEW_LIST_SELECT,
    });
    return result as unknown as AdminReviewListView[];
  }

  // Đếm tổng số đánh giá theo điều kiện lọc.
  async countReviews(where: Prisma.ProductReviewWhereInput): Promise<number> {
    return this.prisma.productReview.count({ where });
  }

  /**
   * Count of visible reviews per star rating (1–5) for storefront breakdown.
   */
  async countVisibleReviewsByStarRating(productId: number): Promise<{
    star1: number;
    star2: number;
    star3: number;
    star4: number;
    star5: number;
  }> {
    const result = {
      star1: 0,
      star2: 0,
      star3: 0,
      star4: 0,
      star5: 0,
    };
    const rows = await this.prisma.productReview.groupBy({
      by: ['rating'],
      where: { productId, status: ReviewVisibility.VISIBLE },
      _count: { _all: true },
    });
    for (const row of rows) {
      const count = row._count._all;
      switch (row.rating) {
        case 1:
          result.star1 = count;
          break;
        case 2:
          result.star2 = count;
          break;
        case 3:
          result.star3 = count;
          break;
        case 4:
          result.star4 = count;
          break;
        case 5:
          result.star5 = count;
          break;
        default:
          break;
      }
    }
    return result;
  }

  /**
   * Visible reviews for storefront product page, newest first.
   */
  async findPublicVisibleReviewsByProductId(params: {
    productId: number;
    skip: number;
    take: number;
  }): Promise<PublicProductReviewListItemView[]> {
    const rows = await this.prisma.productReview.findMany({
      where: {
        productId: params.productId,
        status: ReviewVisibility.VISIBLE,
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        rating: true,
        title: true,
        content: true,
        createdAt: true,
        customer: { select: { fullName: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title,
      content: row.content,
      createdAt: row.createdAt,
      customerFullName: row.customer?.fullName ?? null,
    }));
  }

  async aggregateVisibleReviewStatsByProductId(
    productId: number,
  ): Promise<{ reviewCount: number; averageRating: number | null }> {
    const where: Prisma.ProductReviewWhereInput = {
      productId,
      status: ReviewVisibility.VISIBLE,
    };
    const [aggregate, reviewCount] = await Promise.all([
      this.prisma.productReview.aggregate({
        where,
        _avg: { rating: true },
      }),
      this.prisma.productReview.count({ where }),
    ]);
    if (reviewCount === 0) {
      return { reviewCount: 0, averageRating: null };
    }
    const rawAvg = aggregate._avg.rating;
    const averageRating =
      rawAvg === null || rawAvg === undefined ? null : Number(Number(rawAvg).toFixed(1));
    return { reviewCount, averageRating };
  }

  // Tìm kiếm chi tiết một đánh giá theo ID.
  async findById(id: number): Promise<AdminReviewDetailView | null> {
    const result = await this.prisma.productReview.findUnique({
      where: { id },
      select: ADMIN_REVIEW_DETAIL_SELECT,
    });
    return result as unknown as AdminReviewDetailView | null;
  }

  // Kiểm tra sự tồn tại của đánh giá theo ID.
  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.productReview.count({ where: { id } });
    return count > 0;
  }

  // Cập nhật trạng thái hoặc dữ liệu của đánh giá.
  async update(id: number, data: Prisma.ProductReviewUpdateInput): Promise<void> {
    await this.prisma.productReview.update({
      where: { id },
      data,
    });
  }

  // Xóa vĩnh viễn một đánh giá.
  async delete(id: number): Promise<void> {
    await this.prisma.productReview.delete({
      where: { id },
    });
  }
}
