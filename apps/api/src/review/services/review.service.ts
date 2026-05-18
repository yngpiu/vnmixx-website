import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus, Prisma, ReviewVisibility } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { PrismaService } from '../../prisma/services/prisma.service';
import type {
  AdminReviewDetailResponseDto,
  AdminReviewsListResponseDto,
  ListAdminReviewsQueryDto,
} from '../dto/admin-review.dto';
import { ReviewRepository } from '../repositories/review.repository';

@Injectable()
// Dịch vụ quản lý các thao tác liên quan đến đánh giá sản phẩm.
export class ReviewService {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly prisma: PrismaService, // Dùng để truy vấn bảng Product và OrderItem
    private readonly auditLogService: AuditLogService,
  ) {}

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
    auditContext: AuditRequestContext = {},
  ): Promise<AdminReviewDetailResponseDto> {
    const beforeData = await this.reviewRepo.findById(id);
    try {
      const exists = await this.reviewRepo.exists(id);
      if (!exists) {
        throw new NotFoundException('Không tìm thấy đánh giá.');
      }

      await this.reviewRepo.update(id, { status });
      const detail = await this.getAdminReviewDetail(id);
      await this.auditLogService.write({
        ...auditContext,
        action: 'review.update',
        resourceType: 'review',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
        afterData: detail,
      });
      return detail;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'review.update',
        resourceType: 'review',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        afterData: { status },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Ẩn đánh giá thay vì xóa cứng để giữ lịch sử moderation và dữ liệu báo cáo.
  async hideAdminReview(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.reviewRepo.findById(id);
    try {
      const exists = await this.reviewRepo.exists(id);
      if (!exists) {
        throw new NotFoundException('Không tìm thấy đánh giá.');
      }

      await this.reviewRepo.update(id, { status: ReviewVisibility.HIDDEN });
      await this.auditLogService.write({
        ...auditContext,
        action: 'review.delete',
        resourceType: 'review',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
        afterData: { status: ReviewVisibility.HIDDEN },
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'review.delete',
        resourceType: 'review',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Tạo đánh giá sản phẩm từ khách hàng.
  async createCustomerReview(
    customerId: number,
    dto: {
      productId: number;
      orderItemId?: number;
      rating: number;
      title?: string;
      content?: string;
    },
  ): Promise<{ id: number }> {
    // Kiểm tra sản phẩm tồn tại
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${dto.productId}`);
    }

    // Nếu có orderItemId, kiểm tra order item thuộc về customer và đã giao thành công
    if (dto.orderItemId) {
      const orderItem = await this.prisma.orderItem.findFirst({
        where: {
          id: dto.orderItemId,
          variant: { productId: dto.productId },
          order: { customerId, status: 'DELIVERED' },
        },
        select: { id: true },
      });
      if (!orderItem) {
        throw new BadRequestException('Không tìm thấy sản phẩm trong đơn hàng đã giao của bạn.');
      }
    }

    // Kiểm tra đánh giá đã tồn tại chưa (tránh duplicate)
    const existingReview = await this.prisma.productReview.findFirst({
      where: {
        productId: dto.productId,
        customerId,
        orderItemId: dto.orderItemId ?? null,
      },
      select: { id: true },
    });
    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá sản phẩm này rồi.');
    }

    // Tạo đánh giá
    const review = await this.reviewRepo.create({
      product: { connect: { id: dto.productId } },
      customer: { connect: { id: customerId } },
      ...(dto.orderItemId ? { orderItem: { connect: { id: dto.orderItemId } } } : {}),
      rating: dto.rating,
      title: dto.title,
      content: dto.content,
      status: ReviewVisibility.VISIBLE,
    });

    return { id: review.id };
  }
}
