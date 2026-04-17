import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { CACHE_KEYS, CACHE_PATTERNS, CACHE_TTL } from '../../redis/cache-keys';
import { RedisService } from '../../redis/redis.service';
import {
  CreateImageDto,
  CreateProductDto,
  CreateVariantDto,
  ListAdminProductsQueryDto,
  ListProductsQueryDto,
  UpdateImageDto,
  UpdateProductDto,
  UpdateVariantDto,
} from '../dto';
import {
  PaginatedResult,
  ProductAdminDetailView,
  ProductDetailView,
  ProductListItemView,
  ProductRepository,
} from '../repositories/product.repository';

@Injectable()
export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly redis: RedisService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  findPublicList(
    query: ListProductsQueryDto,
  ): Promise<
    PaginatedResult<ProductListItemView & { minPrice: number | null; maxPrice: number | null }>
  > {
    const params = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      categorySlug: query.categorySlug,
      colorIds: query.colorIds,
      sizeIds: query.sizeIds,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort: query.sort,
    };

    const hash = this.hashQuery(params);
    return this.redis.getOrSet(CACHE_KEYS.PRODUCT_LIST(hash), CACHE_TTL.PRODUCT_LIST, () =>
      this.repository.findPublicList(params),
    );
  }

  async findBySlug(slug: string) {
    const cached = await this.redis.getOrSet(
      CACHE_KEYS.PRODUCT_SLUG(slug),
      CACHE_TTL.PRODUCT_DETAIL,
      async () => {
        const product = await this.repository.findBySlug(slug);
        return product ? this.transformPublicDetail(product) : null;
      },
    );
    if (!cached) throw new NotFoundException(`Không tìm thấy sản phẩm "${slug}"`);
    return cached;
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  async findAdminList(query: ListAdminProductsQueryDto) {
    const result = await this.repository.findAdminList({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      categoryId: query.categoryId,
      isActive: query.isActive,
      isSoftDeleted: query.isSoftDeleted,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      data: result.data.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        thumbnail: p.thumbnail,
        isActive: p.isActive,
        category: p.category,
        variantCount: p._count.variants,
        totalStock: p.totalStock,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        deletedAt: p.deletedAt,
      })),
      meta: result.meta,
    };
  }

  async findAdminById(id: number) {
    const product = await this.repository.findAdminById(id);
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    return this.transformAdminDetail(product);
  }

  async create(dto: CreateProductDto, auditContext: AuditRequestContext = {}) {
    try {
      const categoryIds = this.resolveProductCategoryIdsInput(dto.categoryIds, dto.categoryId);
      if (categoryIds.length > 0) {
        await this.assertCategoriesExistAndLeaf(categoryIds);
      }

      const colorIds = dto.variants.map((v) => v.colorId);
      const sizeIds = dto.variants.map((v) => v.sizeId);

      const [colorsValid, sizesValid] = await Promise.all([
        this.repository.colorsExist(colorIds),
        this.repository.sizesExist(sizeIds),
      ]);
      if (!colorsValid) throw new BadRequestException('Một hoặc nhiều ID màu sắc không hợp lệ');
      if (!sizesValid) throw new BadRequestException('Một hoặc nhiều ID kích thước không hợp lệ');

      this.validateVariantCombos(dto.variants);
      this.validateSkuUniqueness(dto.variants);

      for (const v of dto.variants) {
        if (await this.repository.skuExists(v.sku)) {
          throw new ConflictException(`SKU "${v.sku}" đã tồn tại`);
        }
      }

      const autoThumbnail = this.resolveCreateThumbnail({
        requestedThumbnail: dto.thumbnail,
        variants: dto.variants,
        images: dto.images ?? [],
      });
      const product = await this.repository.createFull({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        thumbnail: autoThumbnail,
        categoryId: categoryIds[0] ?? null,
        categoryIds,
        isActive: dto.isActive,
        variants: dto.variants,
        images: dto.images ?? [],
      });
      await this.invalidateProductCache(dto.slug);
      const afterData = this.transformAdminDetail(product);
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.create',
        resourceType: 'product',
        resourceId: String(afterData.id),
        status: AuditLogStatus.SUCCESS,
        afterData,
      });
      return afterData;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.create',
        resourceType: 'product',
        status: AuditLogStatus.FAILED,
        afterData: {
          name: dto.name,
          slug: dto.slug,
          variantCount: dto.variants?.length ?? 0,
          imageCount: dto.images?.length ?? 0,
        },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async update(id: number, dto: UpdateProductDto, auditContext: AuditRequestContext = {}) {
    let beforeData: ProductAdminDetailView | undefined;
    try {
      const existing = await this.findAdminByIdOrFail(id);
      beforeData = existing;

      let categoryIdsToSync: number[] | undefined;
      if (dto.categoryIds !== undefined) {
        categoryIdsToSync = this.dedupePositiveIds(dto.categoryIds);
      } else if (dto.categoryId !== undefined) {
        categoryIdsToSync = dto.categoryId ? [dto.categoryId] : [];
      }
      if (categoryIdsToSync !== undefined) {
        if (categoryIdsToSync.length > 0) {
          await this.assertCategoriesExistAndLeaf(categoryIdsToSync);
        }
        await this.repository.syncProductCategories(id, categoryIdsToSync);
      }

      const product = await this.repository.updateBasicInfo(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.thumbnail !== undefined && { thumbnail: dto.thumbnail }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });
      await this.invalidateProductCache(existing.slug);
      if (dto.slug && dto.slug !== existing.slug) {
        await this.redis.del(CACHE_KEYS.PRODUCT_SLUG(dto.slug));
      }
      const afterData = this.transformAdminDetail(product);
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.update',
        resourceType: 'product',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData,
      });
      return afterData;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.update',
        resourceType: 'product',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async softDelete(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.findAdminByIdOrFail(id);
    try {
      await this.repository.softDelete(id);
      await this.invalidateProductCache(beforeData.slug);
      const afterRow = await this.repository.findAdminById(id);
      const afterData = afterRow ? this.transformAdminDetail(afterRow) : undefined;
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.delete',
        resourceType: 'product',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.delete',
        resourceType: 'product',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async restore(id: number, auditContext: AuditRequestContext = {}) {
    const beforeData = await this.findAdminByIdOrFail(id);
    try {
      if (!beforeData.deletedAt) throw new BadRequestException('Sản phẩm chưa bị xóa');

      const restored = await this.repository.restore(id);
      await this.invalidateProductCache(beforeData.slug);
      const afterData = this.transformAdminDetail(restored);
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.restore',
        resourceType: 'product',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData,
      });
      return afterData;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.restore',
        resourceType: 'product',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  async createVariant(
    productId: number,
    dto: CreateVariantDto,
    auditContext: AuditRequestContext = {},
  ) {
    try {
      const product = await this.findAdminByIdOrFail(productId);

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
      await this.invalidateProductCache(product.slug);
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
    variantId: number,
    dto: UpdateVariantDto,
    auditContext: AuditRequestContext = {},
  ) {
    let beforeData: Awaited<ReturnType<ProductRepository['findVariantById']>> | undefined;
    try {
      const product = await this.findAdminByIdOrFail(productId);
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
      await this.invalidateProductCache(product.slug);
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
    variantId: number,
    auditContext: AuditRequestContext = {},
  ): Promise<void> {
    let variant: Awaited<ReturnType<ProductRepository['findVariantById']>> | undefined;
    try {
      const product = await this.findAdminByIdOrFail(productId);
      variant = await this.repository.findVariantById(variantId);
      if (!variant) throw new NotFoundException(`Không tìm thấy biến thể #${variantId}`);
      if (variant.productId !== productId) {
        throw new BadRequestException(
          `Variant #${variantId} does not belong to product #${productId}`,
        );
      }

      await this.repository.softDeleteVariant(variantId);
      await this.invalidateProductCache(product.slug);
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

  // ─── Images ────────────────────────────────────────────────────────────────

  async createImage(
    productId: number,
    dto: CreateImageDto,
    auditContext: AuditRequestContext = {},
  ) {
    try {
      const product = await this.findAdminByIdOrFail(productId);

      if (dto.colorId) {
        const valid = await this.repository.colorsExist([dto.colorId]);
        if (!valid) throw new BadRequestException(`Không tìm thấy màu sắc #${dto.colorId}`);
      }

      const result = await this.repository.createImage(productId, dto);
      await this.invalidateProductCache(product.slug);
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

  async updateImage(
    productId: number,
    imageId: number,
    dto: UpdateImageDto,
    auditContext: AuditRequestContext = {},
  ) {
    let beforeData: Awaited<ReturnType<ProductRepository['findImageById']>> | undefined;
    try {
      const product = await this.findAdminByIdOrFail(productId);
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
      await this.invalidateProductCache(product.slug);
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

  async deleteImage(
    productId: number,
    imageId: number,
    auditContext: AuditRequestContext = {},
  ): Promise<void> {
    let image: Awaited<ReturnType<ProductRepository['findImageById']>> | undefined;
    try {
      const product = await this.findAdminByIdOrFail(productId);
      image = await this.repository.findImageById(imageId);
      if (!image) throw new NotFoundException(`Không tìm thấy hình ảnh #${imageId}`);
      if (image.productId !== productId) {
        throw new BadRequestException(`Hình ảnh #${imageId} không thuộc về sản phẩm #${productId}`);
      }

      await this.repository.deleteImage(imageId);
      await this.invalidateProductCache(product.slug);
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.image.delete',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.SUCCESS,
        beforeData: { productId, imageId, image },
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'product.image.delete',
        resourceType: 'product',
        resourceId: String(productId),
        status: AuditLogStatus.FAILED,
        beforeData: image !== undefined ? { productId, imageId, image } : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async findAdminByIdOrFail(id: number): Promise<ProductAdminDetailView> {
    const product = await this.repository.findAdminById(id);
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    return product;
  }

  private validateVariantCombos(variants: { colorId: number; sizeId: number }[]): void {
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

  private validateSkuUniqueness(variants: { sku: string }[]): void {
    const skus = new Set<string>();
    for (const v of variants) {
      if (skus.has(v.sku)) {
        throw new BadRequestException(`Duplicate SKU in request: "${v.sku}"`);
      }
      skus.add(v.sku);
    }
  }

  private resolveCreateThumbnail(params: {
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

  private transformPublicDetail(product: ProductDetailView) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      thumbnail: product.thumbnail,
      category: product.category,
      variants: product.variants,
      images: product.images,
    };
  }

  private transformAdminDetail(product: ProductAdminDetailView) {
    const categoryIdsFromJoin = product.productCategories?.map((r) => r.categoryId) ?? [];
    const categoryIds =
      categoryIdsFromJoin.length > 0
        ? categoryIdsFromJoin
        : product.category
          ? [product.category.id]
          : [];

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      thumbnail: product.thumbnail,
      isActive: product.isActive,
      category: product.category,
      categoryIds,
      variants: product.variants,
      images: product.images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
    };
  }

  private dedupePositiveIds(ids: number[]): number[] {
    return [...new Set(ids.filter((id) => Number.isInteger(id) && id >= 1))];
  }

  /** Ưu tiên `categoryIds`; nếu rỗng thì dùng `categoryId` đơn (legacy). */
  private resolveProductCategoryIdsInput(
    categoryIds: number[] | undefined,
    categoryId: number | undefined,
  ): number[] {
    const fromArr = this.dedupePositiveIds(categoryIds ?? []);
    if (fromArr.length > 0) return fromArr;
    if (categoryId != null && categoryId >= 1) return [categoryId];
    return [];
  }

  private async assertCategoriesExistAndLeaf(categoryIds: number[]): Promise<void> {
    for (const cid of categoryIds) {
      const exists = await this.repository.categoryExists(cid);
      if (!exists)
        throw new BadRequestException(`Không tìm thấy danh mục #${cid} hoặc danh mục đã bị xóa`);
      const isLeaf = await this.repository.isLeafCategory(cid);
      if (!isLeaf)
        throw new BadRequestException(
          `Danh mục #${cid} vẫn còn danh mục con; chỉ được gán danh mục lá.`,
        );
    }
  }

  private async invalidateProductCache(slug: string): Promise<void> {
    await Promise.all([
      this.redis.del(CACHE_KEYS.PRODUCT_SLUG(slug)),
      this.redis.deleteByPattern(CACHE_PATTERNS.ALL_PRODUCT_LISTS),
    ]);
  }

  private hashQuery(params: Record<string, unknown>): string {
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

  private handleUniqueViolation(err: unknown): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') ?? 'field';
      throw new ConflictException(`Unique constraint violation on ${target}`);
    }
  }
}
