import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '../../../generated/prisma/client';
import { CACHE_KEYS, CACHE_PATTERNS, CACHE_TTL } from '../../redis/cache-keys';
import { RedisService } from '../../redis/redis.service';
import {
  CreateImageDto,
  CreateProductDto,
  CreateVariantDto,
  ListAdminProductsQueryDto,
  ListProductsQueryDto,
  SyncAttributesDto,
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
      includeDeleted: query.includeDeleted,
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

  async create(dto: CreateProductDto) {
    if (dto.categoryId) {
      const exists = await this.repository.categoryExists(dto.categoryId);
      if (!exists)
        throw new BadRequestException(
          `Không tìm thấy danh mục #${dto.categoryId} hoặc danh mục đã bị xóa`,
        );
      const isLeaf = await this.repository.isLeafCategory(dto.categoryId);
      if (!isLeaf)
        throw new BadRequestException(
          `Category #${dto.categoryId} has subcategories. Products can only be added to leaf categories`,
        );
    }

    const attrValueIds = dto.attributeValueIds ?? [];
    if (attrValueIds.length > 0) {
      const valid = await this.repository.attributeValuesExist(attrValueIds);
      if (!valid)
        throw new BadRequestException('Một hoặc nhiều ID giá trị thuộc tính không hợp lệ');
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
    this.validateSalePrices(dto.variants);

    for (const v of dto.variants) {
      if (await this.repository.skuExists(v.sku)) {
        throw new ConflictException(`SKU "${v.sku}" đã tồn tại`);
      }
    }

    try {
      const product = await this.repository.createFull({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        thumbnail: dto.thumbnail,
        categoryId: dto.categoryId,
        isActive: dto.isActive,
        attributeValueIds: attrValueIds,
        variants: dto.variants,
        images: dto.images ?? [],
      });
      await this.invalidateProductCache(dto.slug);
      return this.transformAdminDetail(product);
    } catch (err) {
      this.handleUniqueViolation(err);
      throw err;
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.findAdminByIdOrFail(id);

    if (dto.categoryId) {
      const exists = await this.repository.categoryExists(dto.categoryId);
      if (!exists)
        throw new BadRequestException(
          `Không tìm thấy danh mục #${dto.categoryId} hoặc danh mục đã bị xóa`,
        );
      const isLeaf = await this.repository.isLeafCategory(dto.categoryId);
      if (!isLeaf)
        throw new BadRequestException(
          `Category #${dto.categoryId} has subcategories. Products can only be added to leaf categories`,
        );
    }

    try {
      const product = await this.repository.updateBasicInfo(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.thumbnail !== undefined && { thumbnail: dto.thumbnail }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });
      await this.invalidateProductCache(existing.slug);
      if (dto.slug && dto.slug !== existing.slug) {
        await this.redis.del(CACHE_KEYS.PRODUCT_SLUG(dto.slug));
      }
      return this.transformAdminDetail(product);
    } catch (err) {
      this.handleUniqueViolation(err);
      throw err;
    }
  }

  async softDelete(id: number): Promise<void> {
    const product = await this.findAdminByIdOrFail(id);
    await this.repository.softDelete(id);
    await this.invalidateProductCache(product.slug);
  }

  async restore(id: number) {
    const product = await this.findAdminByIdOrFail(id);
    if (!product.deletedAt) throw new BadRequestException('Sản phẩm chưa bị xóa');

    const restored = await this.repository.restore(id);
    await this.invalidateProductCache(product.slug);
    return this.transformAdminDetail(restored);
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  async createVariant(productId: number, dto: CreateVariantDto) {
    const product = await this.findAdminByIdOrFail(productId);

    const [colorsValid, sizesValid] = await Promise.all([
      this.repository.colorsExist([dto.colorId]),
      this.repository.sizesExist([dto.sizeId]),
    ]);
    if (!colorsValid) throw new BadRequestException(`Không tìm thấy màu sắc #${dto.colorId}`);
    if (!sizesValid) throw new BadRequestException(`Không tìm thấy kích thước #${dto.sizeId}`);

    if (dto.salePrice !== undefined && dto.salePrice >= dto.price) {
      throw new BadRequestException('Giá khuyến mãi phải nhỏ hơn giá gốc');
    }

    if (await this.repository.skuExists(dto.sku)) {
      throw new ConflictException(`SKU "${dto.sku}" đã tồn tại`);
    }

    try {
      const result = await this.repository.createVariant(productId, dto);
      await this.invalidateProductCache(product.slug);
      return result;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          'Biến thể với tổ hợp màu + kích thước này đã tồn tại cho sản phẩm',
        );
      }
      throw err;
    }
  }

  async updateVariant(productId: number, variantId: number, dto: UpdateVariantDto) {
    const product = await this.findAdminByIdOrFail(productId);
    const variant = await this.repository.findVariantById(variantId);
    if (!variant) throw new NotFoundException(`Không tìm thấy biến thể #${variantId}`);
    if (variant.productId !== productId) {
      throw new BadRequestException(
        `Variant #${variantId} does not belong to product #${productId}`,
      );
    }

    const result = await this.repository.updateVariant(variantId, {
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
      ...(dto.onHand !== undefined && { onHand: dto.onHand }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
    await this.invalidateProductCache(product.slug);
    return result;
  }

  async softDeleteVariant(productId: number, variantId: number): Promise<void> {
    const product = await this.findAdminByIdOrFail(productId);
    const variant = await this.repository.findVariantById(variantId);
    if (!variant) throw new NotFoundException(`Không tìm thấy biến thể #${variantId}`);
    if (variant.productId !== productId) {
      throw new BadRequestException(
        `Variant #${variantId} does not belong to product #${productId}`,
      );
    }

    await this.repository.softDeleteVariant(variantId);
    await this.invalidateProductCache(product.slug);
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  async createImage(productId: number, dto: CreateImageDto) {
    const product = await this.findAdminByIdOrFail(productId);

    if (dto.colorId) {
      const valid = await this.repository.colorsExist([dto.colorId]);
      if (!valid) throw new BadRequestException(`Không tìm thấy màu sắc #${dto.colorId}`);
    }

    const result = await this.repository.createImage(productId, dto);
    await this.invalidateProductCache(product.slug);
    return result;
  }

  async updateImage(productId: number, imageId: number, dto: UpdateImageDto) {
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

    const result = await this.repository.updateImage(imageId, {
      ...(dto.colorId !== undefined && { colorId: dto.colorId }),
      ...(dto.altText !== undefined && { altText: dto.altText }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });
    await this.invalidateProductCache(product.slug);
    return result;
  }

  async deleteImage(productId: number, imageId: number): Promise<void> {
    const product = await this.findAdminByIdOrFail(productId);
    const image = await this.repository.findImageById(imageId);
    if (!image) throw new NotFoundException(`Không tìm thấy hình ảnh #${imageId}`);
    if (image.productId !== productId) {
      throw new BadRequestException(`Hình ảnh #${imageId} không thuộc về sản phẩm #${productId}`);
    }

    await this.repository.deleteImage(imageId);
    await this.invalidateProductCache(product.slug);
  }

  // ─── Attributes ────────────────────────────────────────────────────────────

  async syncAttributes(productId: number, dto: SyncAttributesDto): Promise<void> {
    const product = await this.findAdminByIdOrFail(productId);

    if (dto.attributeValueIds.length > 0) {
      const valid = await this.repository.attributeValuesExist(dto.attributeValueIds);
      if (!valid)
        throw new BadRequestException('Một hoặc nhiều ID giá trị thuộc tính không hợp lệ');
    }

    await this.repository.syncAttributes(productId, dto.attributeValueIds);
    await this.invalidateProductCache(product.slug);
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

  private validateSalePrices(variants: { price: number; salePrice?: number }[]): void {
    for (const v of variants) {
      if (v.salePrice !== undefined && v.salePrice >= v.price) {
        throw new BadRequestException(
          `salePrice (${v.salePrice}) must be less than price (${v.price}) for SKU in request`,
        );
      }
    }
  }

  private transformPublicDetail(product: ProductDetailView) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      thumbnail: product.thumbnail,
      category: product.category,
      attributes: product.productAttributes.map((pa) => ({
        name: pa.attributeValue.attribute.name,
        value: pa.attributeValue.value,
      })),
      variants: product.variants,
      images: product.images,
    };
  }

  private transformAdminDetail(product: ProductAdminDetailView) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      thumbnail: product.thumbnail,
      isActive: product.isActive,
      category: product.category,
      attributes: product.productAttributes.map((pa) => ({
        name: pa.attributeValue.attribute.name,
        value: pa.attributeValue.value,
      })),
      attributeValueIds: product.productAttributes.map((pa) => pa.attributeValue.id),
      variants: product.variants,
      images: product.images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
    };
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
