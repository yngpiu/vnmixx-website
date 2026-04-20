import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { CreateVariantDto, UpdateVariantDto } from '../dto';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCacheService } from './product-cache.service';

@Injectable()
export class ProductVariantService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly cacheService: ProductCacheService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createVariant(
    productId: number,
    slug: string,
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
      await this.cacheService.invalidateProductCache(slug);
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Biến thể với tổ hợp màu + kích thước này đã tồn tại cho sản phẩm',
        );
      }
      throw error;
    }
  }

  async updateVariant(
    productId: number,
    slug: string,
    variantId: number,
    dto: UpdateVariantDto,
    auditContext: AuditRequestContext = {},
  ) {
    let beforeData: Awaited<ReturnType<ProductRepository['findVariantById']>> | undefined;
    try {
      const variant = await this.repository.findVariantById(variantId);
      if (!variant) throw new NotFoundException(`Không tìm thấy biến thể #${variantId}`);
      if (variant.productId !== productId) {
        throw new BadRequestException(
          `Variant #${variantId} does not belong to product #${productId}`,
        );
      }

      beforeData = variant;
      const result = await this.repository.updateVariant(variantId, {
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.onHand !== undefined && { onHand: dto.onHand }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });
      await this.cacheService.invalidateProductCache(slug);
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

  async softDeleteVariant(
    productId: number,
    slug: string,
    variantId: number,
    auditContext: AuditRequestContext = {},
  ): Promise<void> {
    let variant: Awaited<ReturnType<ProductRepository['findVariantById']>> | undefined;
    try {
      variant = await this.repository.findVariantById(variantId);
      if (!variant) throw new NotFoundException(`Không tìm thấy biến thể #${variantId}`);
      if (variant.productId !== productId) {
        throw new BadRequestException(
          `Variant #${variantId} does not belong to product #${productId}`,
        );
      }

      await this.repository.softDeleteVariant(variantId);
      await this.cacheService.invalidateProductCache(slug);
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.variant.delete',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.SUCCESS,
        beforeData: { productId, variantId, variant },
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.variant.delete',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.FAILED,
        beforeData: variant !== undefined ? { productId, variantId, variant } : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  validateVariantCombos(variants: { colorId: number; sizeId: number }[]): void {
    const combos = new Set<string>();
    for (const v of variants) {
      const key = `${v.colorId}-${v.sizeId}`;
      if (combos.has(key)) {
        throw new BadRequestException(
          `Duplicate variant combo: colorId=${v.colorId}, sizeId=${v.sizeId}`,
        );
      }
      combos.add(key);
    }
  }

  validateSkuUniqueness(variants: { sku: string }[]): void {
    const skus = new Set<string>();
    for (const v of variants) {
      if (skus.has(v.sku)) {
        throw new BadRequestException(`Duplicate SKU in request: "${v.sku}"`);
      }
      skus.add(v.sku);
    }
  }
}
