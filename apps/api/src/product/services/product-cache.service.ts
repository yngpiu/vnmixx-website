import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '../../redis/services/redis.service';
import { PRODUCT_CACHE_KEYS, PRODUCT_CACHE_PATTERNS } from '../product.cache';

// ProductCacheService: Quản lý bộ nhớ đệm (Cache) cho sản phẩm.
// Giúp tối ưu hiệu năng bằng cách lưu trữ kết quả truy vấn vào Redis và xóa cache khi dữ liệu thay đổi.
@Injectable()
export class ProductCacheService {
  constructor(private readonly redis: RedisService) {}

  // Xóa toàn bộ cache liên quan đến một sản phẩm và tất cả cache danh sách sản phẩm.
  // Cần gọi sau khi Tạo/Cập nhật/Xóa sản phẩm hoặc biến thể.
  async invalidateProductCache(slug: string): Promise<void> {
    await Promise.all([
      this.redis.del(PRODUCT_CACHE_KEYS.PRODUCT_SLUG(slug)),
      this.redis.deleteByPattern(PRODUCT_CACHE_PATTERNS.ALL_PRODUCT_LISTS),
    ]);
  }

  // Xóa cache chi tiết sản phẩm theo Slug.
  async deleteSlugCache(slug: string): Promise<void> {
    await this.redis.del(PRODUCT_CACHE_KEYS.PRODUCT_SLUG(slug));
  }

  // Tạo mã hash từ các tham số truy vấn (Lọc, phân trang, tìm kiếm).
  // Dùng mã hash này làm một phần của Cache Key để phân biệt các kết quả tìm kiếm khác nhau.
  hashQuery(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .filter((k) => params[k] !== undefined)
      .sort()
      .map((k) => {
        const v = params[k];
        return `${k}=${Array.isArray(v) ? (v as unknown[]).sort().join(',') : String(v)}`;
      })
      .join('&');
    return createHash('sha256').update(sorted).digest('hex').slice(0, 8);
  }
}
