import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { isPrismaErrorCode } from '../../common/utils/prisma.util';
import { CreateVariantDto, UpdateVariantDto } from '../dto';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCacheService } from './product-cache.service';

// ProductVariantService: Quản lý các biến thể của sản phẩm.
// Mỗi biến thể là một tổ hợp duy nhất của Màu sắc (Color) và Kích thước (Size).
// Chịu trách nhiệm về SKU, giá bán, và số lượng tồn kho (on-hand) cho từng biến thể.
@Injectable()
export class ProductVariantService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly cacheService: ProductCacheService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Tạo biến thể mới cho một sản phẩm.
  // Logic:
  // 1. Kiểm tra tồn tại của màu sắc và kích thước.
  // 2. Kiểm tra tính duy nhất của SKU trên toàn hệ thống.
  // 3. Ràng buộc DB đảm bảo một sản phẩm không có 2 biến thể trùng (màu, kích thước).
  async createVariant(
    productId: number,
    _slug: string,
    dto: CreateVariantDto,
    auditContext: AuditRequestContext = {},
  ) {
    try {
      const [colorsValid, sizesValid] = await Promise.all([
        this.repository.colorsExist([dto.colorId]),
        this.repository.sizesExist([dto.sizeId]),
      ]);
      if (!colorsValid) throw new BadRequestException(`Không tìm thấy màu sắc #${dto.colorId}`);
      if (!sizesValid) throw new BadRequestException(`Không tìm thấy kích thước #${dto.sizeId}`);

      if (await this.repository.skuExists(dto.sku)) {
        throw new ConflictException(`SKU "${dto.sku}" đã tồn tại`);
      }

      const result = await this.repository.createVariant(productId, dto);
      await this.cacheService.invalidateProductCache(productId);
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.variant.create',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.SUCCESS,
        afterData: { productId, variant: result },
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.variant.create',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.FAILED,
        afterData: { productId, sku: dto.sku, colorId: dto.colorId, sizeId: dto.sizeId },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException(
          'Biến thể với tổ hợp màu + kích thước này đã tồn tại cho sản phẩm',
        );
      }
      throw error;
    }
  }

  // Cập nhật thông tin biến thể (Giá, Tồn kho, Trạng thái).
  // Không cho phép cập nhật Màu sắc/Kích thước sau khi đã tạo để đảm bảo tính toàn vẹn dữ liệu đơn hàng.
  async updateVariant(
    productId: number,
    _slug: string,
    variantId: number,
    dto: UpdateVariantDto,
    auditContext: AuditRequestContext = {},
  ) {
    let beforeData: Awaited<ReturnType<ProductRepository['findVariantById']>> | undefined;
    try {
      const variant = await this.repository.findVariantById(variantId);
      if (!variant) throw new NotFoundException(`Không tìm thấy biến thể #${variantId}`);
      if (variant.productId !== productId) {
        throw new BadRequestException(`Biến thể #${variantId} không thuộc sản phẩm #${productId}`);
      }
      if (dto.onHand !== undefined && dto.onHand < variant.reserved) {
        throw new BadRequestException(
          `Không thể đặt tồn kho on-hand (${dto.onHand}) nhỏ hơn lượng đã giữ (${variant.reserved}).`,
        );
      }

      beforeData = variant;
      const result = await this.repository.updateVariant(variantId, {
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.onHand !== undefined && { onHand: dto.onHand }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });
      await this.cacheService.invalidateProductCache(productId);
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.variant.update',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.SUCCESS,
        beforeData: { productId, variantId, variant: beforeData },
        afterData: { productId, variantId, variant: result },
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.variant.update',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.FAILED,
        beforeData:
          beforeData !== undefined ? { productId, variantId, variant: beforeData } : undefined,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Kiểm tra trùng lặp tổ hợp (màu, kích thước) trong yêu cầu gửi lên.
  validateVariantCombos(variants: { colorId: number; sizeId: number }[]): void {
    const combos = new Set<string>();
    for (const v of variants) {
      const key = `${v.colorId}-${v.sizeId}`;
      if (combos.has(key)) {
        throw new BadRequestException(
          `Tổ hợp biến thể bị trùng: colorId=${v.colorId}, sizeId=${v.sizeId}`,
        );
      }
      combos.add(key);
    }
  }

  // Kiểm tra trùng lặp SKU trong danh sách gửi lên.
  validateSkuUniqueness(variants: { sku: string }[]): void {
    const skus = new Set<string>();
    for (const v of variants) {
      if (skus.has(v.sku)) {
        throw new BadRequestException(`SKU bị trùng trong yêu cầu: "${v.sku}"`);
      }
      skus.add(v.sku);
    }
  }
}
