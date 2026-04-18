import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewVisibility } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AdminReviewDetailResponseDto,
  AdminReviewsListResponseDto,
  ListAdminReviewsQueryDto,
} from './dto/admin-review.dto';
import type { CreateProductReviewDto } from './dto/create-product-review.dto';

type AdminReviewListRow = {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  status: ReviewVisibility;
  createdAt: Date;
  product: { name: string };
  customer: { fullName: string } | null;
};
type AdminReviewDetailRow = {
  id: number;
  productId: number;
  customerId: number;
  rating: number;
  title: string | null;
  content: string | null;
  status: ReviewVisibility;
  createdAt: Date;
  updatedAt: Date;
  product: { name: string };
  customer: { fullName: string; email: string } | null;
};

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async createProductReview(customerId: number, productId: number, dto: CreateProductReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true, deletedAt: true },
    });

    if (!product || product.deletedAt || !product.isActive) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
    }

    const existingReview = await this.prisma.productReview.findUnique({
      where: {
        productId_customerId: {
          productId,
          customerId,
        },
      },
      select: { id: true },
    });

    if (existingReview) {
      throw new ConflictException('Bạn đã review sản phẩm này.');
    }

    const purchasedAndSettledCount = await this.prisma.orderItem.count({
      where: {
        variant: { productId },
        order: {
          customerId,
          status: 'DELIVERED',
          paymentStatus: 'SUCCESS',
        },
      },
    });

    if (purchasedAndSettledCount === 0) {
      throw new BadRequestException(
        'Bạn chỉ có thể review sản phẩm đã nhận hàng và thanh toán thành công.',
      );
    }

    return this.prisma.productReview.create({
      data: {
        productId,
        customerId,
        rating: dto.rating,
        title: dto.title ?? null,
        content: dto.content ?? null,
        status: ReviewVisibility.VISIBLE,
      },
      select: {
        id: true,
        productId: true,
        customerId: true,
        rating: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getAdminReviews(query: ListAdminReviewsQueryDto): Promise<AdminReviewsListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const keyword = query.keyword?.trim();
    const visibility = query.visibility ?? 'all';

    const where: Prisma.ProductReviewWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(visibility === 'visible'
        ? { status: ReviewVisibility.VISIBLE }
        : visibility === 'hidden'
          ? { status: ReviewVisibility.HIDDEN }
          : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { content: { contains: keyword } },
              { product: { name: { contains: keyword } } },
              { customer: { fullName: { contains: keyword } } },
            ],
          }
        : {}),
    };

    const [total, rows] = (await Promise.all([
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          rating: true,
          title: true,
          content: true,
          status: true,
          createdAt: true,
          product: { select: { name: true } },
          customer: { select: { fullName: true } },
        },
      }),
    ])) as [number, AdminReviewListRow[]];

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items: rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        title: row.title,
        content: row.content,
        status: row.status,
        createdAt: row.createdAt,
        productName: row.product.name,
        customerName: row.customer?.fullName ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getAdminReviewDetail(id: number): Promise<AdminReviewDetailResponseDto> {
    const review = (await this.prisma.productReview.findUnique({
      where: { id },
      select: {
        id: true,
        productId: true,
        customerId: true,
        rating: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        product: { select: { name: true } },
        customer: { select: { fullName: true, email: true } },
      },
    })) as AdminReviewDetailRow | null;

    if (!review) {
      throw new NotFoundException('Không tìm thấy review.');
    }

    return {
      id: review.id,
      productId: review.productId,
      customerId: review.customerId,
      rating: review.rating,
      title: review.title,
      content: review.content,
      status: review.status,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      productName: review.product.name,
      customerName: review.customer?.fullName ?? null,
      customerEmail: review.customer?.email ?? null,
    };
  }

  async updateAdminReviewStatus(
    id: number,
    status: ReviewVisibility,
  ): Promise<AdminReviewDetailResponseDto> {
    const review = await this.prisma.productReview.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy review.');
    }

    await this.prisma.productReview.update({
      where: { id },
      data: { status },
    });

    return this.getAdminReviewDetail(id);
  }

  async deleteAdminReview(id: number): Promise<void> {
    const review = await this.prisma.productReview.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy review.');
    }

    await this.prisma.productReview.delete({ where: { id } });
  }
}
