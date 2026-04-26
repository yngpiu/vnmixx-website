import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewVisibility } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';
import type {
  AdminReviewDetailResponseDto,
  AdminReviewsListResponseDto,
  ListAdminReviewsQueryDto,
} from '../dto/admin-review.dto';
import type { CreateProductReviewDto } from '../dto/create-product-review.dto';
import { ReviewRepository } from '../repositories/review.repository';

@Injectable()
// Dịch vụ quản lý các thao tác liên quan đến đánh giá sản phẩm.
export class ReviewService {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly prisma: PrismaService, // Dùng để truy vấn bảng Product và OrderItem
  ) {}

  // Ghi nhận đánh giá mới của khách hàng cho sản phẩm.
  async createProductReview(
    customerId: number,
    productId: number,
    dto: CreateProductReviewDto,
  ): Promise<void> {
    // 1. Kiểm tra sản phẩm có tồn tại và đang hoạt động không.
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true, deletedAt: true },
    });

    if (!product || product.deletedAt || !product.isActive) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
    }

    // 2. Kiểm tra xem khách hàng đã đánh giá sản phẩm này chưa.
    const existingReview = await this.reviewRepo.findByProductAndCustomer(productId, customerId);
    if (existingReview) {
      throw new ConflictException('Bạn đã review sản phẩm này.');
    }

    // 3. Kiểm tra điều kiện mua hàng: đã nhận hàng và thanh toán thành công.
    const purchasedAndSettledCount = await this.prisma.orderItem.count({
      where: {
        variant: { productId },
        order: {
          customerId,
          status: 'DELIVERED',
          payments: { some: { status: 'SUCCESS' } },
        },
      },
    });

    if (purchasedAndSettledCount === 0) {
      throw new BadRequestException(
        'Bạn chỉ có thể review sản phẩm đã nhận hàng và thanh toán thành công.',
      );
    }

    // 4. Thực hiện tạo review.
    await this.reviewRepo.create({
      productId,
      customerId,
      rating: dto.rating,
      title: dto.title ?? null,
      content: dto.content ?? null,
      status: ReviewVisibility.VISIBLE,
    });
  }

  // Lấy danh sách đánh giá phục vụ quản trị (Admin).
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

    const [total, rows] = await Promise.all([
      this.reviewRepo.countReviews(where),
      this.reviewRepo.findAdminReviews({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

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

  // Lấy chi tiết một đánh giá cho Admin.
  async getAdminReviewDetail(id: number): Promise<AdminReviewDetailResponseDto> {
    const review = await this.reviewRepo.findById(id);

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

  // Cập nhật trạng thái hiển thị của đánh giá.
  async updateAdminReviewStatus(
    id: number,
    status: ReviewVisibility,
  ): Promise<AdminReviewDetailResponseDto> {
    const exists = await this.reviewRepo.exists(id);
    if (!exists) {
      throw new NotFoundException('Không tìm thấy review.');
    }

    await this.reviewRepo.update(id, { status });

    return this.getAdminReviewDetail(id);
  }

  // Xóa vĩnh viễn một đánh giá.
  async deleteAdminReview(id: number): Promise<void> {
    const exists = await this.reviewRepo.exists(id);
    if (!exists) {
      throw new NotFoundException('Không tìm thấy review.');
    }

    await this.reviewRepo.delete(id);
  }
}
