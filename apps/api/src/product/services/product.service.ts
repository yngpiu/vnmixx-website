import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
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
  constructor(private readonly repository: ProductRepository) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  findPublicList(
    query: ListProductsQueryDto,
  ): Promise<
    PaginatedResult<ProductListItemView & { minPrice: number | null; maxPrice: number | null }>
  > {
    return this.repository.findPublicList({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      categorySlug: query.categorySlug,
      colorIds: query.colorIds,
      sizeIds: query.sizeIds,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort: query.sort,
    });
  }

  async findBySlug(slug: string) {
    const product = await this.repository.findBySlug(slug);
    if (!product) throw new NotFoundException(`Product "${slug}" not found`);
    return this.transformPublicDetail(product);
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
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return this.transformAdminDetail(product);
  }

  async create(dto: CreateProductDto) {
    if (dto.categoryId) {
      const exists = await this.repository.categoryExists(dto.categoryId);
      if (!exists)
        throw new BadRequestException(`Category #${dto.categoryId} not found or deleted`);
    }

    const attrValueIds = dto.attributeValueIds ?? [];
    if (attrValueIds.length > 0) {
      const valid = await this.repository.attributeValuesExist(attrValueIds);
      if (!valid) throw new BadRequestException('One or more attribute value IDs are invalid');
    }

    const colorIds = dto.variants.map((v) => v.colorId);
    const sizeIds = dto.variants.map((v) => v.sizeId);

    const [colorsValid, sizesValid] = await Promise.all([
      this.repository.colorsExist(colorIds),
      this.repository.sizesExist(sizeIds),
    ]);
    if (!colorsValid) throw new BadRequestException('One or more color IDs are invalid');
    if (!sizesValid) throw new BadRequestException('One or more size IDs are invalid');

    this.validateVariantCombos(dto.variants);
    this.validateSkuUniqueness(dto.variants);
    this.validateSalePrices(dto.variants);

    for (const v of dto.variants) {
      if (await this.repository.skuExists(v.sku)) {
        throw new ConflictException(`SKU "${v.sku}" already exists`);
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
      return this.transformAdminDetail(product);
    } catch (err) {
      this.handleUniqueViolation(err);
      throw err;
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findAdminByIdOrFail(id);

    if (dto.categoryId) {
      const exists = await this.repository.categoryExists(dto.categoryId);
      if (!exists)
        throw new BadRequestException(`Category #${dto.categoryId} not found or deleted`);
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
      return this.transformAdminDetail(product);
    } catch (err) {
      this.handleUniqueViolation(err);
      throw err;
    }
  }

  async softDelete(id: number): Promise<void> {
    await this.findAdminByIdOrFail(id);
    await this.repository.softDelete(id);
  }

  async restore(id: number) {
    const product = await this.findAdminByIdOrFail(id);
    if (!product.deletedAt) throw new BadRequestException('Product is not deleted');

    const restored = await this.repository.restore(id);
    return this.transformAdminDetail(restored);
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  async createVariant(productId: number, dto: CreateVariantDto) {
    await this.findAdminByIdOrFail(productId);

    const [colorsValid, sizesValid] = await Promise.all([
      this.repository.colorsExist([dto.colorId]),
      this.repository.sizesExist([dto.sizeId]),
    ]);
    if (!colorsValid) throw new BadRequestException(`Color #${dto.colorId} not found`);
    if (!sizesValid) throw new BadRequestException(`Size #${dto.sizeId} not found`);

    if (dto.salePrice !== undefined && dto.salePrice >= dto.price) {
      throw new BadRequestException('salePrice must be less than price');
    }

    if (await this.repository.skuExists(dto.sku)) {
      throw new ConflictException(`SKU "${dto.sku}" already exists`);
    }

    try {
      return await this.repository.createVariant(productId, dto);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          'A variant with this color + size combo already exists for this product',
        );
      }
      throw err;
    }
  }

  async updateVariant(productId: number, variantId: number, dto: UpdateVariantDto) {
    await this.findAdminByIdOrFail(productId);
    const variant = await this.repository.findVariantById(variantId);
    if (!variant) throw new NotFoundException(`Variant #${variantId} not found`);
    if (variant.productId !== productId) {
      throw new BadRequestException(
        `Variant #${variantId} does not belong to product #${productId}`,
      );
    }

    return this.repository.updateVariant(variantId, {
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
      ...(dto.stockQty !== undefined && { stockQty: dto.stockQty }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
  }

  async softDeleteVariant(productId: number, variantId: number): Promise<void> {
    await this.findAdminByIdOrFail(productId);
    const variant = await this.repository.findVariantById(variantId);
    if (!variant) throw new NotFoundException(`Variant #${variantId} not found`);
    if (variant.productId !== productId) {
      throw new BadRequestException(
        `Variant #${variantId} does not belong to product #${productId}`,
      );
    }

    await this.repository.softDeleteVariant(variantId);
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  async createImage(productId: number, dto: CreateImageDto) {
    await this.findAdminByIdOrFail(productId);

    if (dto.colorId) {
      const valid = await this.repository.colorsExist([dto.colorId]);
      if (!valid) throw new BadRequestException(`Color #${dto.colorId} not found`);
    }

    return this.repository.createImage(productId, dto);
  }

  async updateImage(productId: number, imageId: number, dto: UpdateImageDto) {
    await this.findAdminByIdOrFail(productId);
    const image = await this.repository.findImageById(imageId);
    if (!image) throw new NotFoundException(`Image #${imageId} not found`);
    if (image.productId !== productId) {
      throw new BadRequestException(`Image #${imageId} does not belong to product #${productId}`);
    }

    if (dto.colorId) {
      const valid = await this.repository.colorsExist([dto.colorId]);
      if (!valid) throw new BadRequestException(`Color #${dto.colorId} not found`);
    }

    return this.repository.updateImage(imageId, {
      ...(dto.colorId !== undefined && { colorId: dto.colorId }),
      ...(dto.altText !== undefined && { altText: dto.altText }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });
  }

  async deleteImage(productId: number, imageId: number): Promise<void> {
    await this.findAdminByIdOrFail(productId);
    const image = await this.repository.findImageById(imageId);
    if (!image) throw new NotFoundException(`Image #${imageId} not found`);
    if (image.productId !== productId) {
      throw new BadRequestException(`Image #${imageId} does not belong to product #${productId}`);
    }

    await this.repository.deleteImage(imageId);
  }

  // ─── Attributes ────────────────────────────────────────────────────────────

  async syncAttributes(productId: number, dto: SyncAttributesDto): Promise<void> {
    await this.findAdminByIdOrFail(productId);

    if (dto.attributeValueIds.length > 0) {
      const valid = await this.repository.attributeValuesExist(dto.attributeValueIds);
      if (!valid) throw new BadRequestException('One or more attribute value IDs are invalid');
    }

    await this.repository.syncAttributes(productId, dto.attributeValueIds);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async findAdminByIdOrFail(id: number): Promise<ProductAdminDetailView> {
    const product = await this.repository.findAdminById(id);
    if (!product) throw new NotFoundException(`Product #${id} not found`);
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

  private handleUniqueViolation(err: unknown): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') ?? 'field';
      throw new ConflictException(`Unique constraint violation on ${target}`);
    }
  }
}
