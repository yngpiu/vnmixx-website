import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import {
  getPrismaErrorTargets,
  isPrismaErrorCode,
  isPrismaKnownRequestError,
} from '../../common/errors/prisma-error.util';
import { CACHE_KEYS, CACHE_TTL } from '../../redis/cache-keys';
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
import { ProductCacheService } from './product-cache.service';
import { ProductImageService } from './product-image.service';
import { ProductVariantService } from './product-variant.service';

/**
 * ProductService: Quản lý logic cốt lõi của sản phẩm.
 * Bao gồm: Tạo/cập nhật thông tin cơ bản, quản lý trạng thái, và điều phối các thành phần liên quan (biến thể, hình ảnh).
 * Tích hợp Cache (Redis) để tối ưu hiệu năng và Audit Log để theo dõi lịch sử thay đổi.
 */
@Injectable()
export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly cacheService: ProductCacheService,
    private readonly variantService: ProductVariantService,
    private readonly imageService: ProductImageService,
    private readonly auditLogService: AuditLogService,
    private readonly redis: RedisService,
  ) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  /**
   * Truy vấn danh sách sản phẩm cho khách hàng.
   * Sử dụng Cache để giảm tải cho Database.
   */
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

    const hash = this.cacheService.hashQuery(params);
    return this.redis.getOrSet(CACHE_KEYS.PRODUCT_LIST(hash), CACHE_TTL.PRODUCT_LIST, () =>
      this.repository.findPublicList(params),
    );
  }

  /**
   * Lấy chi tiết sản phẩm qua Slug cho khách hàng.
   */
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

  /**
   * Truy vấn danh sách sản phẩm cho quản trị viên.
   * Hỗ trợ lọc theo trạng thái (isActive, isSoftDeleted) và phân trang.
   */
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

  /**
   * Logic tạo sản phẩm mới:
   * 1. Kiểm tra danh mục (phải là danh mục lá).
   * 2. Kiểm tra tính hợp lệ của Màu sắc và Kích thước.
   * 3. Validate tổ hợp biến thể và tính duy nhất của SKU.
   * 4. Tự động xác định ảnh đại diện (thumbnail) nếu không được cung cấp.
   * 5. Lưu DB và ghi Audit Log.
   */
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

      this.variantService.validateVariantCombos(dto.variants);
      this.variantService.validateSkuUniqueness(dto.variants);

      for (const v of dto.variants) {
        if (await this.repository.skuExists(v.sku)) {
          throw new ConflictException(`SKU "${v.sku}" đã tồn tại`);
        }
      }

      const autoThumbnail = this.imageService.resolveCreateThumbnail({
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
      await this.cacheService.invalidateProductCache(dto.slug);
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

  /**
   * Cập nhật thông tin cơ bản của sản phẩm.
   * Xử lý đồng bộ danh mục và xóa Cache khi thông tin thay đổi.
   */
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
      await this.cacheService.invalidateProductCache(existing.slug);
      if (dto.slug && dto.slug !== existing.slug) {
        await this.cacheService.deleteSlugCache(dto.slug);
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

  /**
   * Xóa mềm sản phẩm (Soft Delete) và xóa Cache liên quan.
   */
  async softDelete(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.findAdminByIdOrFail(id);
    try {
      await this.repository.softDelete(id);
      await this.cacheService.invalidateProductCache(beforeData.slug);
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
      await this.cacheService.invalidateProductCache(beforeData.slug);
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

  // ─── Variants Delegation ──────────────────────────────────────────────────
  // Các phương thức dưới đây ủy quyền (delegate) xử lý cho ProductVariantService

  async createVariant(
    productId: number,
    dto: CreateVariantDto,
    auditContext: AuditRequestContext = {},
  ) {
    const product = await this.findAdminByIdOrFail(productId);
    return this.variantService.createVariant(productId, product.slug, dto, auditContext);
  }

  async updateVariant(
    productId: number,
    variantId: number,
    dto: UpdateVariantDto,
    auditContext: AuditRequestContext = {},
  ) {
    const product = await this.findAdminByIdOrFail(productId);
    return this.variantService.updateVariant(productId, product.slug, variantId, dto, auditContext);
  }

  async softDeleteVariant(
    productId: number,
    variantId: number,
    auditContext: AuditRequestContext = {},
  ): Promise<void> {
    const product = await this.findAdminByIdOrFail(productId);
    return this.variantService.softDeleteVariant(productId, product.slug, variantId, auditContext);
  }

  // ─── Images Delegation ────────────────────────────────────────────────────
  // Các phương thức dưới đây ủy quyền xử lý cho ProductImageService

  async createImage(
    productId: number,
    dto: CreateImageDto,
    auditContext: AuditRequestContext = {},
  ) {
    const product = await this.findAdminByIdOrFail(productId);
    return this.imageService.createImage(productId, product.slug, dto, auditContext);
  }

  async updateImage(
    productId: number,
    imageId: number,
    dto: UpdateImageDto,
    auditContext: AuditRequestContext = {},
  ) {
    const product = await this.findAdminByIdOrFail(productId);
    return this.imageService.updateImage(productId, product.slug, imageId, dto, auditContext);
  }

  async deleteImage(
    productId: number,
    imageId: number,
    auditContext: AuditRequestContext = {},
  ): Promise<void> {
    const product = await this.findAdminByIdOrFail(productId);
    return this.imageService.deleteImage(productId, product.slug, imageId, auditContext);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async findAdminByIdOrFail(id: number): Promise<ProductAdminDetailView> {
    const product = await this.repository.findAdminById(id);
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    return product;
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

  /**
   * Đảm bảo danh mục tồn tại và là danh mục lá (không có danh mục con).
   * Ràng buộc này đảm bảo cấu trúc dữ liệu chính xác cho việc gán sản phẩm.
   */
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

  private handleUniqueViolation(err: unknown): void {
    if (isPrismaErrorCode(err, 'P2002') && isPrismaKnownRequestError(err)) {
      const target = getPrismaErrorTargets(err).join(', ') || 'field';
      throw new ConflictException(`Dữ liệu bị trùng lặp ở trường: ${target}`);
    }
  }
}
