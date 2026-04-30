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
} from '../../common/utils/prisma.util';
import { RedisService } from '../../redis/services/redis.service';
import {
  CreateImageDto,
  CreateProductDto,
  CreateVariantDto,
  ListAdminProductsQueryDto,
  ListProductsQueryDto,
  UpdateProductDto,
} from '../dto';
import { PRODUCT_CACHE_KEYS, PRODUCT_CACHE_TTL } from '../product.cache';
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

// Quản lý logic cốt lõi của sản phẩm: thông tin cơ bản, biến thể và hình ảnh
// Tích hợp Redis Cache để tối ưu hiệu năng và Audit Log để theo dõi lịch sử thay đổi
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

  // ─── Công khai (Khách hàng) ──────────────────────────────────────────────────

  // Truy vấn danh sách sản phẩm cho khách hàng, sử dụng Redis Cache để giảm tải DB
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

    // Dùng mã băm của params làm key để cache các kết quả tìm kiếm khác nhau
    const hash = this.cacheService.hashQuery(params);
    return this.redis.getOrSet(
      PRODUCT_CACHE_KEYS.PRODUCT_LIST(hash),
      PRODUCT_CACHE_TTL.PRODUCT_LIST,
      () => this.repository.findPublicList(params),
    );
  }

  // Lấy chi tiết sản phẩm qua Slug cho khách hàng có sử dụng Cache
  async findBySlug(slug: string) {
    const cached = await this.redis.getOrSet(
      PRODUCT_CACHE_KEYS.PRODUCT_SLUG(slug),
      PRODUCT_CACHE_TTL.PRODUCT_DETAIL,
      async () => {
        const product = await this.repository.findBySlug(slug);
        if (!product) {
          return null;
        }
        return this.transformPublicDetail(product);
      },
    );
    if (!cached) throw new NotFoundException(`Không tìm thấy sản phẩm "${slug}"`);
    return cached;
  }

  // ─── Quản trị (Admin) ───────────────────────────────────────────────────────

  // Truy vấn danh sách sản phẩm cho quản trị viên, hỗ trợ lọc sâu và phân trang
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

  // Tìm chi tiết sản phẩm theo ID cho admin
  async findAdminById(id: number) {
    const product = await this.repository.findAdminById(id);
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    return this.transformAdminDetail(product);
  }

  // Logic tạo sản phẩm mới đầy đủ các thành phần liên quan
  async create(dto: CreateProductDto, auditContext: AuditRequestContext = {}) {
    try {
      // 1. Kiểm tra danh mục phải tồn tại và là danh mục lá (không có con)
      const categoryIds = this.resolveProductCategoryIdsInput(dto.categoryIds);
      if (categoryIds.length > 0) {
        await this.assertCategoriesExistAndLeaf(categoryIds);
      }

      // 2. Kiểm tra tính hợp lệ của tất cả các Màu sắc và Kích thước được dùng trong biến thể
      const colorIds = dto.variants.map((v) => v.colorId);
      const sizeIds = dto.variants.map((v) => v.sizeId);

      const [colorsValid, sizesValid] = await Promise.all([
        this.repository.colorsExist(colorIds),
        this.repository.sizesExist(sizeIds),
      ]);
      if (!colorsValid) throw new BadRequestException('Một hoặc nhiều ID màu sắc không hợp lệ');
      if (!sizesValid) throw new BadRequestException('Một hoặc nhiều ID kích thước không hợp lệ');

      // 3. Validate tính duy nhất của SKU và tổ hợp các biến thể
      this.variantService.validateVariantCombos(dto.variants);
      this.variantService.validateSkuUniqueness(dto.variants);

      for (const v of dto.variants) {
        if (await this.repository.skuExists(v.sku)) {
          throw new ConflictException(`SKU "${v.sku}" đã tồn tại`);
        }
      }

      // 4. Tự động xác định ảnh thumbnail dựa trên các ảnh được cung cấp
      const autoThumbnail = this.imageService.resolveCreateThumbnail({
        requestedThumbnail: dto.thumbnail,
        variants: dto.variants,
        images: dto.images ?? [],
      });

      // 5. Lưu toàn bộ thông tin sản phẩm vào DB trong một transaction ngầm
      const product = await this.repository.createFull({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        thumbnail: autoThumbnail,
        weight: dto.weight,
        length: dto.length,
        width: dto.width,
        height: dto.height,
        categoryIds,
        isActive: dto.isActive,
        variants: dto.variants,
        images: dto.images ?? [],
      });

      // 6. Xóa Cache danh sách sản phẩm vì dữ liệu đã thay đổi
      await this.cacheService.invalidateProductCache(dto.slug);

      // 7. Ghi Audit Log để theo dõi vết tạo mới của nhân viên
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

  // Cập nhật thông tin cơ bản của sản phẩm
  async update(id: number, dto: UpdateProductDto, auditContext: AuditRequestContext = {}) {
    let beforeData: ProductAdminDetailView | undefined;
    try {
      const existing = await this.findAdminByIdOrFail(id);
      beforeData = existing;

      // 1. Xử lý cập nhật danh mục nếu có thay đổi
      let categoryIdsToSync: number[] | undefined;
      if (dto.categoryIds !== undefined) {
        categoryIdsToSync = this.dedupePositiveIds(dto.categoryIds);
      }
      if (categoryIdsToSync !== undefined) {
        if (categoryIdsToSync.length > 0) {
          await this.assertCategoriesExistAndLeaf(categoryIdsToSync);
        }
        await this.repository.syncProductCategories(id, categoryIdsToSync);
      }

      // 2. Cập nhật các thông tin cơ bản (tên, slug, mô tả...)
      const product = await this.repository.updateBasicInfo(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.thumbnail !== undefined && { thumbnail: dto.thumbnail }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.length !== undefined && { length: dto.length }),
        ...(dto.width !== undefined && { width: dto.width }),
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });

      // 3. Upsert biến thể nếu được gửi trong payload.
      if (dto.variants !== undefined) {
        await this.upsertProductVariants(id, existing.slug, dto.variants);
      }

      // 4. Upsert hình ảnh nếu được gửi trong payload.
      if (dto.images !== undefined) {
        await this.upsertProductImages(id, existing.slug, dto.images);
      }

      // 3. Xóa Cache cũ và Cache Slug mới (nếu Slug thay đổi) để đảm bảo dữ liệu mới nhất
      await this.cacheService.invalidateProductCache(existing.slug);
      if (dto.slug && dto.slug !== existing.slug) {
        await this.cacheService.deleteSlugCache(dto.slug);
      }

      // 4. Ghi Audit Log thành công
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

  // Xóa mềm sản phẩm và xóa Cache liên quan
  async softDelete(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.findAdminByIdOrFail(id);
    try {
      await this.repository.softDelete(id);
      // Buộc xóa cache để khách hàng không nhìn thấy sản phẩm đã bị xóa
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

  // Khôi phục sản phẩm đã bị xóa mềm
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

  // ─── Các hàm bổ trợ ─────────────────────────────────────────────────────────

  private async upsertProductVariants(
    productId: number,
    slug: string,
    variants: NonNullable<UpdateProductDto['variants']>,
  ): Promise<void> {
    this.variantService.validateVariantCombos(
      variants.flatMap((variant) =>
        variant.colorId !== undefined && variant.sizeId !== undefined
          ? [{ colorId: variant.colorId, sizeId: variant.sizeId }]
          : [],
      ),
    );
    this.variantService.validateSkuUniqueness(
      variants.flatMap((variant) => (variant.sku !== undefined ? [{ sku: variant.sku }] : [])),
    );

    for (const variant of variants) {
      if (variant.id !== undefined) {
        await this.updateExistingVariant(productId, slug, variant.id, variant);
        continue;
      }
      const createdVariant = this.toCreateVariantPayload(variant);
      await this.variantService.createVariant(productId, slug, createdVariant);
    }
  }

  private async updateExistingVariant(
    productId: number,
    slug: string,
    variantId: number,
    variant: NonNullable<UpdateProductDto['variants']>[number],
  ): Promise<void> {
    const updatePayload = {
      ...(variant.price !== undefined && { price: variant.price }),
      ...(variant.onHand !== undefined && { onHand: variant.onHand }),
      ...(variant.isActive !== undefined && { isActive: variant.isActive }),
    };
    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException(
        `Biến thể #${variantId} thiếu dữ liệu cập nhật. Hãy gửi price, onHand hoặc isActive.`,
      );
    }
    await this.variantService.updateVariant(productId, slug, variantId, updatePayload);
  }

  private toCreateVariantPayload(
    variant: NonNullable<UpdateProductDto['variants']>[number],
  ): CreateVariantDto {
    if (
      variant.colorId === undefined ||
      variant.sizeId === undefined ||
      variant.sku === undefined ||
      variant.price === undefined ||
      variant.onHand === undefined
    ) {
      throw new BadRequestException(
        'Biến thể mới phải có đầy đủ colorId, sizeId, sku, price và onHand.',
      );
    }
    return {
      colorId: variant.colorId,
      sizeId: variant.sizeId,
      sku: variant.sku,
      price: variant.price,
      onHand: variant.onHand,
    };
  }

  private async upsertProductImages(
    productId: number,
    slug: string,
    images: NonNullable<UpdateProductDto['images']>,
  ): Promise<void> {
    for (const image of images) {
      if (image.id !== undefined) {
        await this.updateExistingImage(productId, slug, image.id, image);
        continue;
      }
      const createdImage = this.toCreateImagePayload(image);
      await this.imageService.createImage(productId, slug, createdImage);
    }
  }

  private async updateExistingImage(
    productId: number,
    slug: string,
    imageId: number,
    image: NonNullable<UpdateProductDto['images']>[number],
  ): Promise<void> {
    const updatePayload = {
      ...(image.colorId !== undefined && { colorId: image.colorId }),
      ...(image.altText !== undefined && { altText: image.altText }),
      ...(image.sortOrder !== undefined && { sortOrder: image.sortOrder }),
    };
    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException(
        `Hình ảnh #${imageId} thiếu dữ liệu cập nhật. Hãy gửi colorId, altText hoặc sortOrder.`,
      );
    }
    await this.imageService.updateImage(productId, slug, imageId, updatePayload);
  }

  private toCreateImagePayload(
    image: NonNullable<UpdateProductDto['images']>[number],
  ): CreateImageDto {
    if (image.url === undefined) {
      throw new BadRequestException('Hình ảnh mới phải có url.');
    }
    return {
      url: image.url,
      ...(typeof image.colorId === 'number' && { colorId: image.colorId }),
      ...(typeof image.altText === 'string' && { altText: image.altText }),
      ...(image.sortOrder !== undefined && { sortOrder: image.sortOrder }),
    };
  }

  // Tìm sản phẩm cho admin hoặc ném lỗi nếu không tồn tại
  private async findAdminByIdOrFail(id: number): Promise<ProductAdminDetailView> {
    const product = await this.repository.findAdminById(id);
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    return product;
  }

  // Chuyển đổi dữ liệu thô sang định dạng hiển thị cho khách hàng
  private transformPublicDetail(product: ProductDetailView) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      thumbnail: product.thumbnail,
      weight: product.weight,
      length: product.length,
      width: product.width,
      height: product.height,
      category: product.category,
      variants: product.variants,
      images: product.images,
    };
  }

  // Chuyển đổi dữ liệu thô sang định dạng hiển thị cho quản trị viên
  private transformAdminDetail(product: ProductAdminDetailView) {
    const categoryIdsFromJoin = product.productCategories?.map((r) => r.categoryId) ?? [];
    const categoryIds = categoryIdsFromJoin;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      thumbnail: product.thumbnail,
      weight: product.weight,
      length: product.length,
      width: product.width,
      height: product.height,
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

  // Loại bỏ các ID trùng lặp và ID không hợp lệ (< 1)
  private dedupePositiveIds(ids: number[]): number[] {
    return [...new Set(ids.filter((id) => Number.isInteger(id) && id >= 1))];
  }

  // Xử lý logic gán ID danh mục: chuẩn hóa danh sách mảng ID được truyền từ client
  private resolveProductCategoryIdsInput(categoryIds: number[] | undefined): number[] {
    const fromArr = this.dedupePositiveIds(categoryIds ?? []);
    return fromArr;
  }

  // Đảm bảo danh mục tồn tại và là danh mục lá (không có danh mục con) để đảm bảo tính nhất quán dữ liệu
  private async assertCategoriesExistAndLeaf(categoryIds: number[]): Promise<void> {
    for (const cid of categoryIds) {
      const exists = await this.repository.categoryExists(cid);
      if (!exists)
        throw new BadRequestException(
          `Không tìm thấy danh mục #${cid}, danh mục đã bị xóa hoặc đang bị vô hiệu hóa`,
        );
      const isLeaf = await this.repository.isLeafCategory(cid);
      if (!isLeaf)
        throw new BadRequestException(
          `Danh mục #${cid} vẫn còn danh mục con; chỉ được gán danh mục lá.`,
        );
    }
  }

  // Xử lý lỗi vi phạm ràng buộc duy nhất từ Prisma (ví dụ: trùng Slug hoặc SKU)
  private handleUniqueViolation(err: unknown): void {
    if (isPrismaErrorCode(err, 'P2002') && isPrismaKnownRequestError(err)) {
      const target = getPrismaErrorTargets(err).join(', ') || 'field';
      throw new ConflictException(`Dữ liệu bị trùng lặp ở trường: ${target}`);
    }
  }
}
