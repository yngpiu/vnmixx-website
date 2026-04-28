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
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('rating phải nằm trong khoảng từ 1 đến 5.');
    }

    // 1. Kiểm tra sản phẩm có tồn tại và đang hoạt động không.
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true, deletedAt: true },
    });

    if (!product || product.deletedAt || !product.isActive) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
    }

    // 2. Kiểm tra xem khách hàng đã đánh giá đúng order item này chưa.
    const existingReview = await this.reviewRepo.findByProductCustomerAndOrderItem(
      productId,
      customerId,
      dto.orderItemId,
    );
    if (existingReview) {
      throw new ConflictException('Bạn đã đánh giá biến thể này trong lần mua này.');
    }

    // 3. Kiểm tra điều kiện mua hàng theo đúng order item: đúng khách, đúng sản phẩm, đã giao + thanh toán.
    const purchasedOrderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: dto.orderItemId,
        variant: { productId },
        order: {
          customerId,
          status: 'DELIVERED',
          payments: { some: { status: 'SUCCESS' } },
        },
      },
      select: { id: true },
    });

    if (!purchasedOrderItem) {
      throw new BadRequestException(
        'Bạn chỉ có thể đánh giá đúng biến thể đã nhận hàng và thanh toán thành công.',
      );
    }

    // 4. Thực hiện tạo đánh giá.
    await this.reviewRepo.create({
      productId,
      customerId,
      orderItemId: dto.orderItemId,
      rating: dto.rating,
      title: null,
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
      throw new NotFoundException('Không tìm thấy đánh giá.');
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
      throw new NotFoundException('Không tìm thấy đánh giá.');
    }

    await this.reviewRepo.update(id, { status });

    return this.getAdminReviewDetail(id);
  }

  // Xóa vĩnh viễn một đánh giá.
  async deleteAdminReview(id: number): Promise<void> {
    const exists = await this.reviewRepo.exists(id);
    if (!exists) {
      throw new NotFoundException('Không tìm thấy đánh giá.');
    }

    await this.reviewRepo.delete(id);
  }
}
