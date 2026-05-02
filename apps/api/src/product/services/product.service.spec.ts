import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogStatus } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { RedisService } from '../../redis/services/redis.service';
import { CreateProductDto, ListAdminProductsQueryDto, ListProductsQueryDto } from '../dto';
import { ProductAdminDetailView, ProductRepository } from '../repositories/product.repository';
import { ProductCacheService } from './product-cache.service';
import { ProductImageService } from './product-image.service';
import { ProductVariantService } from './product-variant.service';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let repository: jest.Mocked<ProductRepository>;
  let cacheService: jest.Mocked<ProductCacheService>;
  let variantService: jest.Mocked<ProductVariantService>;
  let imageService: jest.Mocked<ProductImageService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let redis: jest.Mocked<RedisService>;

  const mockProduct: ProductAdminDetailView = {
    id: 1,
    name: 'Test Product',
    slug: 'test-product',
    description: 'Desc',
    weight: 100,
    length: 10,
    width: 10,
    height: 5,
    isActive: true,
    category: { id: 3, name: 'Cat', slug: 'cat' },
    productCategories: [{ categoryId: 3 }],
    variants: [],
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: {
            findPublicList: jest.fn(),
            findBySlug: jest.fn(),
            findAdminList: jest.fn(),
            findAdminById: jest.fn(),
            createFull: jest.fn(),
            updateBasicInfo: jest.fn(),
            softDelete: jest.fn(),
            restore: jest.fn(),
            syncProductCategories: jest.fn(),
            categoryExists: jest.fn(),
            isLeafCategory: jest.fn(),
            colorsExist: jest.fn(),
            sizesExist: jest.fn(),
            skuExists: jest.fn(),
          },
        },
        {
          provide: ProductCacheService,
          useValue: {
            invalidateProductCache: jest.fn(),
            deleteSlugCache: jest.fn(),
            hashQuery: jest.fn().mockReturnValue('hash'),
          },
        },
        {
          provide: ProductVariantService,
          useValue: {
            validateVariantCombos: jest.fn(),
            validateSkuUniqueness: jest.fn(),
            createVariant: jest.fn(),
            updateVariant: jest.fn(),
            softDeleteVariant: jest.fn(),
          },
        },
        {
          provide: ProductImageService,
          useValue: {
            createImage: jest.fn(),
            updateImage: jest.fn(),
            deleteImage: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: { write: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: {
            getOrSet: jest
              .fn()
              .mockImplementation((key, ttl, factory: () => Promise<unknown>) => factory()),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get(ProductRepository);
    cacheService = module.get(ProductCacheService);
    variantService = module.get(ProductVariantService);
    imageService = module.get(ProductImageService);
    auditLogService = module.get(AuditLogService);
    redis = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findPublicList', () => {
    it('should call repository via redis getOrSet', async () => {
      const result = {
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      repository.findPublicList.mockResolvedValue(result);

      const query: ListProductsQueryDto = { page: 1, limit: 10 };
      const response = await service.findPublicList(query);

      expect(response).toBe(result);
      expect(redis.getOrSet).toHaveBeenCalled();
      expect(repository.findPublicList).toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('should return transformed product detail', async () => {
      repository.findBySlug.mockResolvedValue(mockProduct);

      const result = await service.findBySlug('test-product');

      expect(result.id).toBe(mockProduct.id);
      expect(repository.findBySlug).toHaveBeenCalledWith('test-product');
    });

    it('should throw NotFoundException if product not found', async () => {
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.findBySlug('not-found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAdminList', () => {
    it('should return admin list with totalStock', async () => {
      const adminResult = {
        data: [{ ...mockProduct, _count: { variants: 5 }, totalStock: 100 } as any],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      repository.findAdminList.mockResolvedValue(adminResult as any);

      const query: ListAdminProductsQueryDto = {};
      const result = await service.findAdminList(query);

      expect(result.data[0].variantCount).toBe(5);
      expect(result.data[0].totalStock).toBe(100);
    });
  });

  describe('create', () => {
    const dto: CreateProductDto = {
      name: 'New Product',
      slug: 'new-product',
      variants: [{ colorId: 1, sizeId: 1, sku: 'SKU1', price: 100, onHand: 10 }],
      categoryIds: [3],
    };

    it('should create a product and log success', async () => {
      repository.categoryExists.mockResolvedValue(true);
      repository.isLeafCategory.mockResolvedValue(true);
      repository.colorsExist.mockResolvedValue(true);
      repository.sizesExist.mockResolvedValue(true);
      repository.skuExists.mockResolvedValue(false);
      repository.createFull.mockResolvedValue(mockProduct);

      const result = await service.create(dto);

      expect(result.id).toBe(mockProduct.id);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should throw BadRequestException if category is not leaf', async () => {
      repository.categoryExists.mockResolvedValue(true);
      repository.isLeafCategory.mockResolvedValue(false);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if SKU exists', async () => {
      repository.categoryExists.mockResolvedValue(true);
      repository.isLeafCategory.mockResolvedValue(true);
      repository.colorsExist.mockResolvedValue(true);
      repository.sizesExist.mockResolvedValue(true);
      repository.skuExists.mockResolvedValue(true);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should log failure on error', async () => {
      repository.categoryExists.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(dto)).rejects.toThrow('DB Error');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.FAILED }),
      );
    });
  });

  describe('update', () => {
    it('should update basic info and sync categories', async () => {
      repository.findAdminById.mockResolvedValue(mockProduct);
      repository.categoryExists.mockResolvedValue(true);
      repository.isLeafCategory.mockResolvedValue(true);
      repository.updateBasicInfo.mockResolvedValue({ ...mockProduct, name: 'Updated' });

      const result = await service.update(1, { name: 'Updated', categoryIds: [4] });

      expect(result.name).toBe('Updated');
      expect(repository.syncProductCategories).toHaveBeenCalledWith(1, [4]);
      expect(cacheService.invalidateProductCache).toHaveBeenCalled();
    });

    it('should handle slug change', async () => {
      repository.findAdminById.mockResolvedValue(mockProduct);
      repository.updateBasicInfo.mockResolvedValue({ ...mockProduct, slug: 'new-slug' });

      await service.update(1, { slug: 'new-slug' });

      expect(cacheService.deleteSlugCache).toHaveBeenCalledWith('new-slug');
    });

    it('should upsert variants and images in update payload', async () => {
      repository.findAdminById.mockResolvedValue(mockProduct);
      repository.updateBasicInfo.mockResolvedValue(mockProduct);
      variantService.updateVariant.mockResolvedValue({} as never);
      variantService.createVariant.mockResolvedValue({} as never);
      imageService.updateImage.mockResolvedValue({} as never);
      imageService.createImage.mockResolvedValue({} as never);

      await service.update(1, {
        variants: [
          { id: 10, price: 200000, onHand: 20, isActive: true },
          { colorId: 1, sizeId: 2, sku: 'SKU-NEW', price: 300000, onHand: 5 },
        ],
        images: [
          { id: 11, altText: 'New alt', sortOrder: 1 },
          { url: 'https://example.com/new-image.jpg', colorId: 1, sortOrder: 0 },
        ],
      });

      expect(variantService.validateVariantCombos).toHaveBeenCalled();
      expect(variantService.validateSkuUniqueness).toHaveBeenCalled();
      expect(variantService.updateVariant).toHaveBeenCalledWith(
        1,
        mockProduct.slug,
        10,
        expect.objectContaining({ price: 200000, onHand: 20, isActive: true }),
      );
      expect(variantService.createVariant).toHaveBeenCalledWith(
        1,
        mockProduct.slug,
        expect.objectContaining({
          colorId: 1,
          sizeId: 2,
          sku: 'SKU-NEW',
          price: 300000,
          onHand: 5,
        }),
      );
      expect(imageService.updateImage).toHaveBeenCalledWith(
        1,
        mockProduct.slug,
        11,
        expect.objectContaining({ altText: 'New alt', sortOrder: 1 }),
      );
      expect(imageService.createImage).toHaveBeenCalledWith(
        1,
        mockProduct.slug,
        expect.objectContaining({
          url: 'https://example.com/new-image.jpg',
          colorId: 1,
          sortOrder: 0,
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete and invalidate cache', async () => {
      repository.findAdminById.mockResolvedValue(mockProduct);

      await service.softDelete(1);

      expect(repository.softDelete).toHaveBeenCalledWith(1);
      expect(cacheService.invalidateProductCache).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'product.delete', status: AuditLogStatus.SUCCESS }),
      );
    });
  });

  describe('restore', () => {
    it('should restore deleted product', async () => {
      const deletedProduct: ProductAdminDetailView = { ...mockProduct, deletedAt: new Date() };
      repository.findAdminById.mockResolvedValueOnce(deletedProduct);
      repository.restore.mockResolvedValue(mockProduct);

      const result = await service.restore(1);

      expect(result.deletedAt).toBeNull();
      expect(repository.restore).toHaveBeenCalledWith(1);
    });

    it('should throw BadRequestException if product not deleted', async () => {
      repository.findAdminById.mockResolvedValue(mockProduct);

      await expect(service.restore(1)).rejects.toThrow(BadRequestException);
    });
  });
});
