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
          payment: { is: { status: 'SUCCESS' } },
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

  /**
   * Paginated visible reviews for storefront, by product ID, with aggregate stats.
   */
  async listPublicReviewsByProductId(
    productId: number,
    page: number,
    limit: number,
  ): Promise<{
    data: Array<{
      id: number;
      rating: number;
      title: string | null;
      content: string | null;
      createdAt: Date;
      authorDisplayName: string;
    }>;
    meta: { page: number; limit: number; total: number; totalPages: number };
    reviewCount: number;
    averageRating: number | null;
    ratingBreakdown: {
      star1: number;
      star2: number;
      star3: number;
      star4: number;
      star5: number;
    };
  }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
    }
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit) ? Math.min(50, Math.max(1, Math.floor(limit))) : 10;
    const [stats, rows, ratingBreakdown] = await Promise.all([
      this.reviewRepo.aggregateVisibleReviewStatsByProductId(product.id),
      this.reviewRepo.findPublicVisibleReviewsByProductId({
        productId: product.id,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.reviewRepo.countVisibleReviewsByStarRating(product.id),
    ]);
    const total = stats.reviewCount;
    const totalPages = total === 0 ? 1 : Math.ceil(total / safeLimit);
    return {
      data: rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        title: row.title,
        content: row.content,
        createdAt: row.createdAt,
        authorDisplayName: ReviewService.maskReviewAuthorName(row.customerFullName),
      })),
      meta: { page: safePage, limit: safeLimit, total, totalPages },
      reviewCount: stats.reviewCount,
      averageRating: stats.averageRating,
      ratingBreakdown,
    };
  }

  async listPublicReviewsByProductSlug(
    productSlug: string,
    page: number,
    limit: number,
  ): Promise<{
    data: Array<{
      id: number;
      rating: number;
      title: string | null;
      content: string | null;
      createdAt: Date;
      authorDisplayName: string;
    }>;
    meta: { page: number; limit: number; total: number; totalPages: number };
    reviewCount: number;
    averageRating: number | null;
    ratingBreakdown: {
      star1: number;
      star2: number;
      star3: number;
      star4: number;
      star5: number;
    };
  }> {
    const product = await this.prisma.product.findFirst({
      where: { slug: productSlug, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm "${productSlug}"`);
    }
    return this.listPublicReviewsByProductId(product.id, page, limit);
  }

  private static maskReviewAuthorName(fullName: string | null): string {
    if (fullName === null || fullName.trim() === '') {
      return 'Khách hàng';
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      const word = parts[0];
      return word.length <= 2 ? `${word.charAt(0)}*` : `${word.slice(0, 2)}***`;
    }
    const first = parts[0];
    const last = parts[parts.length - 1];
    return `${first} ${last.charAt(0)}.`;
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

  // Ẩn đánh giá thay vì xóa cứng để giữ lịch sử moderation và dữ liệu báo cáo.
  async hideAdminReview(id: number): Promise<void> {
    const exists = await this.reviewRepo.exists(id);
    if (!exists) {
      throw new NotFoundException('Không tìm thấy đánh giá.');
    }

    await this.reviewRepo.update(id, { status: ReviewVisibility.HIDDEN });
  }
}
