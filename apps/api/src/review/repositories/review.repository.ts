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

export interface ProductReviewSimpleView {
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

const PRODUCT_REVIEW_SIMPLE_SELECT = {
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
} as const satisfies Prisma.ProductReviewSelect;

@Injectable()
// Repository Prisma cho các thao tác với dữ liệu đánh giá sản phẩm.
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Tạo đánh giá mới cho sản phẩm.
  async create(data: Prisma.ProductReviewUncheckedCreateInput): Promise<ProductReviewSimpleView> {
    const result = await this.prisma.productReview.create({
      data: data as unknown as Prisma.ProductReviewCreateInput,
      select: PRODUCT_REVIEW_SIMPLE_SELECT,
    });
    return result as unknown as ProductReviewSimpleView;
  }

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

  // Tìm đánh giá của một khách hàng theo từng dòng sản phẩm đã mua.
  async findByProductCustomerAndOrderItem(
    productId: number,
    customerId: number,
    orderItemId: number,
  ) {
    return this.prisma.productReview.findUnique({
      where: {
        productId_customerId_orderItemId: {
          productId,
          customerId,
          orderItemId,
        },
      },
      select: { id: true },
    });
  }
}
