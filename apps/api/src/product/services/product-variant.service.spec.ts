import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { CreateVariantDto, UpdateVariantDto } from '../dto';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCacheService } from './product-cache.service';
import { ProductVariantService } from './product-variant.service';

describe('ProductVariantService', () => {
  let service: ProductVariantService;
  let repository: jest.Mocked<ProductRepository>;
  let cacheService: jest.Mocked<ProductCacheService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockVariant = {
    id: 10,
    productId: 1,
    colorId: 1,
    sizeId: 1,
    sku: 'SKU1',
    price: 100,
    onHand: 50,
    reserved: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    color: { id: 1, name: 'White', hexCode: '#FFFFFF' },
    size: { id: 1, label: 'S', sortOrder: 0 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariantService,
        {
          provide: ProductRepository,
          useValue: {
            colorsExist: jest.fn(),
            sizesExist: jest.fn(),
            skuExists: jest.fn(),
            createVariant: jest.fn(),
            findVariantById: jest.fn(),
            updateVariant: jest.fn(),
          },
        },
        {
          provide: ProductCacheService,
          useValue: { invalidateProductCache: jest.fn() },
        },
        {
          provide: AuditLogService,
          useValue: { write: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ProductVariantService>(ProductVariantService);
    repository = module.get(ProductRepository);
    cacheService = module.get(ProductCacheService);
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVariant', () => {
    const dto: CreateVariantDto = { colorId: 1, sizeId: 1, sku: 'SKU1', price: 100, onHand: 50 };

    it('should create variant and log success', async () => {
      repository.colorsExist.mockResolvedValue(true);
      repository.sizesExist.mockResolvedValue(true);
      repository.skuExists.mockResolvedValue(false);
      repository.createVariant.mockResolvedValue(mockVariant as any);

      const result = await service.createVariant(1, 'slug', dto);

      expect(result).toEqual(mockVariant);
      expect(cacheService.invalidateProductCache).toHaveBeenCalledWith('slug');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'product.variant.create',
          status: AuditLogStatus.SUCCESS,
        }),
      );
    });

    it('should throw ConflictException if SKU exists', async () => {
      repository.colorsExist.mockResolvedValue(true);
      repository.sizesExist.mockResolvedValue(true);
      repository.skuExists.mockResolvedValue(true);

      await expect(service.createVariant(1, 'slug', dto)).rejects.toThrow(ConflictException);
    });

    it('should handle unique constraint error from DB', async () => {
      repository.colorsExist.mockResolvedValue(true);
      repository.sizesExist.mockResolvedValue(true);
      repository.skuExists.mockResolvedValue(false);
      const error = new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2002',
        clientVersion: '1',
      });
      repository.createVariant.mockRejectedValue(error);

      await expect(service.createVariant(1, 'slug', dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateVariant', () => {
    const dto: UpdateVariantDto = { price: 200 };

    it('should update and log success', async () => {
      repository.findVariantById.mockResolvedValue({
        id: 10,
        productId: 1,
        isActive: true,
        deletedAt: null,
      } as any);
      repository.updateVariant.mockResolvedValue({ ...mockVariant, price: 200 } as any);

      const result = await service.updateVariant(1, 'slug', 10, dto);

      expect(result.price).toBe(200);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'product.variant.update',
          status: AuditLogStatus.SUCCESS,
        }),
      );
    });

    it('should throw NotFoundException if variant not found', async () => {
      repository.findVariantById.mockResolvedValue(null);
      await expect(service.updateVariant(1, 'slug', 10, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if variant belongs to another product', async () => {
      repository.findVariantById.mockResolvedValue({
        id: 10,
        productId: 99,
        isActive: true,
        deletedAt: null,
      } as any);
      await expect(service.updateVariant(1, 'slug', 10, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Validation Helpers', () => {
    it('validateVariantCombos should throw on duplicates', () => {
      const variants = [
        { colorId: 1, sizeId: 1 },
        { colorId: 1, sizeId: 1 },
      ];
      expect(() => service.validateVariantCombos(variants)).toThrow(BadRequestException);
    });

    it('validateSkuUniqueness should throw on duplicates', () => {
      const variants = [{ sku: 'S1' }, { sku: 'S1' }];
      expect(() => service.validateSkuUniqueness(variants)).toThrow(BadRequestException);
    });
  });
});
