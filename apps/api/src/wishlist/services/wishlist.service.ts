import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaErrorCode } from '../../common/utils/prisma.util';
import { RedisService } from '../../redis/services/redis.service';
import { ListWishlistQueryDto } from '../dto';
import {
  type WishlistItemView,
  type WishlistPaginatedView,
  WishlistRepository,
} from '../repositories/wishlist.repository';
import { WISHLIST_CACHE_KEYS, WISHLIST_CACHE_TTL } from '../wishlist.cache';

@Injectable()
// Xử lý logic nghiệp vụ cho danh sách yêu thích với chiến lược cache.
export class WishlistService {
  constructor(
    private readonly wishlistRepo: WishlistRepository,
    private readonly redis: RedisService,
  ) {}

  // Lấy danh sách yêu thích của khách hàng, ưu tiên lấy từ cache.
  async findAll(
    customerId: number,
    query: ListWishlistQueryDto,
  ): Promise<{
    data: WishlistItemView[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const cached = await this.redis.getOrSet<WishlistPaginatedView>(
      WISHLIST_CACHE_KEYS.LIST(customerId, page, limit),
      WISHLIST_CACHE_TTL.LIST,
      () => this.wishlistRepo.findAllByCustomerId(customerId, page, limit),
    );
    const totalPages = cached.total > 0 ? Math.ceil(cached.total / limit) : 1;
    return {
      data: cached.data,
      meta: {
        page,
        limit,
        total: cached.total,
        totalPages,
      },
    };
  }

  // Thêm sản phẩm vào danh sách yêu thích và xóa cache liên quan.
  async add(customerId: number, productId: number): Promise<void> {
    // Kiểm tra sự tồn tại của sản phẩm trước khi thêm.
    const productExists = await this.wishlistRepo.productExists(productId);
    if (!productExists) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
    }

    try {
      await this.wishlistRepo.add(customerId, productId);
      // Xóa cache để dữ liệu được cập nhật mới ở lần truy vấn sau.
      await this.redis.deleteByPattern(WISHLIST_CACHE_KEYS.LIST_PATTERN(customerId));
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích.');
      }
      if (isPrismaErrorCode(error, 'P2003')) {
        throw new BadRequestException('Không thể thêm sản phẩm vào danh sách yêu thích.');
      }
      throw error;
    }
  }

  // Xóa sản phẩm khỏi danh sách yêu thích và cập nhật lại cache.
  async remove(customerId: number, productId: number): Promise<void> {
    try {
      await this.wishlistRepo.remove(customerId, productId);
      // Xóa cache sau khi xóa thành công để đồng bộ dữ liệu.
      await this.redis.deleteByPattern(WISHLIST_CACHE_KEYS.LIST_PATTERN(customerId));
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2025')) {
        throw new NotFoundException('Sản phẩm không có trong danh sách yêu thích.');
      }
      if (isPrismaErrorCode(error, 'P2003')) {
        throw new BadRequestException('Không thể xóa sản phẩm khỏi danh sách yêu thích.');
      }
      throw error;
    }
  }
}
