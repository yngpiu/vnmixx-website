import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { CreateImageDto, UpdateImageDto } from '../dto';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCacheService } from './product-cache.service';

// ProductImageService: Quản lý thư viện hình ảnh của sản phẩm.
// Hỗ trợ gắn hình ảnh với từng màu sắc cụ thể để hiển thị chính xác khi khách hàng chọn màu.
@Injectable()
export class ProductImageService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly cacheService: ProductCacheService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Thêm hình ảnh mới cho sản phẩm.
  // Hình ảnh có thể gắn với một `colorId` hoặc dùng chung cho toàn bộ sản phẩm.
  async createImage(
    productId: number,
    slug: string,
    dto: CreateImageDto,
    auditContext: AuditRequestContext = {},
  ) {
    try {
      if (dto.colorId) {
        const valid = await this.repository.colorsExist([dto.colorId]);
        if (!valid) throw new BadRequestException(`Không tìm thấy màu sắc #${dto.colorId}`);
      }

      const result = await this.repository.createImage(productId, dto);
      await this.cacheService.invalidateProductCache(slug);
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.image.create',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.SUCCESS,
        afterData: { productId, image: result },
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.image.create',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.FAILED,
        afterData: { productId, url: dto.url, colorId: dto.colorId, sortOrder: dto.sortOrder },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Cập nhật thông tin hình ảnh (Màu sắc liên kết, văn bản thay thế, thứ tự hiển thị).
  async updateImage(
    productId: number,
    slug: string,
    imageId: number,
    dto: UpdateImageDto,
    auditContext: AuditRequestContext = {},
  ) {
    let beforeData: Awaited<ReturnType<ProductRepository['findImageById']>> | undefined;
    try {
      const image = await this.repository.findImageById(imageId);
      if (!image) throw new NotFoundException(`Không tìm thấy hình ảnh #${imageId}`);
      if (image.productId !== productId) {
        throw new BadRequestException(`Hình ảnh #${imageId} không thuộc về sản phẩm #${productId}`);
      }

      if (dto.colorId) {
        const valid = await this.repository.colorsExist([dto.colorId]);
        if (!valid) throw new BadRequestException(`Không tìm thấy màu sắc #${dto.colorId}`);
      }

      beforeData = image;
      const result = await this.repository.updateImage(imageId, {
        ...(dto.colorId !== undefined && { colorId: dto.colorId }),
        ...(dto.altText !== undefined && { altText: dto.altText }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      });
      await this.cacheService.invalidateProductCache(slug);
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.image.update',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.SUCCESS,
        beforeData: { productId, imageId, image: beforeData },
        afterData: { productId, imageId, image: result },
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.image.update',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.FAILED,
        beforeData:
          beforeData !== undefined ? { productId, imageId, image: beforeData } : undefined,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Logic xác định Thumbnail tự động:
  // Nếu không cung cấp requestedThumbnail, hệ thống sẽ lấy ảnh đầu tiên của màu sắc thuộc biến thể đầu tiên.
  resolveCreateThumbnail(params: {
    requestedThumbnail?: string;
    variants: { colorId: number }[];
    images: { url: string; colorId?: number; sortOrder?: number }[];
  }): string | undefined {
    if (params.requestedThumbnail?.trim()) {
      return params.requestedThumbnail.trim();
    }
    if (params.images.length === 0 || params.variants.length === 0) {
      return undefined;
    }
    const firstColorId = params.variants[0]?.colorId;
    if (!firstColorId) {
      return undefined;
    }
    const firstImageOfFirstColor = params.images
      .filter((image) => image.colorId === firstColorId)
      .sort((left, right) => {
        const leftSortOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const rightSortOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return leftSortOrder - rightSortOrder;
      })[0];
    return firstImageOfFirstColor?.url;
  }
}
