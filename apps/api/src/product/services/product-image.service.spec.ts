import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogStatus } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { CreateImageDto, UpdateImageDto } from '../dto';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCacheService } from './product-cache.service';
import { ProductImageService } from './product-image.service';

describe('ProductImageService', () => {
  let service: ProductImageService;
  let repository: jest.Mocked<ProductRepository>;
  let cacheService: jest.Mocked<ProductCacheService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockImage = {
    id: 100,
    productId: 1,
    url: 'https://example.com/image.jpg',
    colorId: 1,
    altText: 'Alt',
    sortOrder: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductImageService,
        {
          provide: ProductRepository,
          useValue: {
            colorsExist: jest.fn(),
            createImage: jest.fn(),
            findImageById: jest.fn(),
            updateImage: jest.fn(),
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

    service = module.get<ProductImageService>(ProductImageService);
    repository = module.get(ProductRepository);
    cacheService = module.get(ProductCacheService);
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createImage', () => {
    const dto: CreateImageDto = { url: 'img.jpg', colorId: 1 };

    it('should create image and log success', async () => {
      repository.colorsExist.mockResolvedValue(true);
      repository.createImage.mockResolvedValue(mockImage as any);

      const result = await service.createImage(1, 'slug', dto);

      expect(result).toEqual(mockImage);
      expect(cacheService.invalidateProductCache).toHaveBeenCalledWith('slug');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'product.image.create', status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should throw BadRequestException if color does not exist', async () => {
      repository.colorsExist.mockResolvedValue(false);
      await expect(service.createImage(1, 'slug', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateImage', () => {
    const dto: UpdateImageDto = { altText: 'New' };

    it('should update and log success', async () => {
      repository.findImageById.mockResolvedValue({ id: 100, productId: 1 } as any);
      repository.colorsExist.mockResolvedValue(true);
      repository.updateImage.mockResolvedValue({ ...mockImage, altText: 'New' } as any);

      const result = await service.updateImage(1, 'slug', 100, dto);

      expect(result.altText).toBe('New');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'product.image.update', status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should throw NotFoundException if image not found', async () => {
      repository.findImageById.mockResolvedValue(null);
      await expect(service.updateImage(1, 'slug', 100, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if image belongs to another product', async () => {
      repository.findImageById.mockResolvedValue({ id: 100, productId: 99 } as any);
      await expect(service.updateImage(1, 'slug', 100, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveCreateThumbnail', () => {
    it('should return requested thumbnail if provided', () => {
      const res = service.resolveCreateThumbnail({
        requestedThumbnail: 'req.jpg',
        variants: [],
        images: [],
      });
      expect(res).toBe('req.jpg');
    });

    it('should return first image of first color if no thumbnail requested', () => {
      const res = service.resolveCreateThumbnail({
        variants: [{ colorId: 10 }, { colorId: 20 }],
        images: [
          { url: 'img2.jpg', colorId: 10, sortOrder: 1 },
          { url: 'img1.jpg', colorId: 10, sortOrder: 0 },
          { url: 'img3.jpg', colorId: 20, sortOrder: 0 },
        ],
      });
      expect(res).toBe('img1.jpg');
    });

    it('should return undefined if no images match first color', () => {
      const res = service.resolveCreateThumbnail({
        variants: [{ colorId: 10 }],
        images: [{ url: 'img.jpg', colorId: 20 }],
      });
      expect(res).toBeUndefined();
    });
  });
});
