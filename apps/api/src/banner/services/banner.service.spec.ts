import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { RedisService } from '../../redis/services/redis.service';
import { BannerRepository } from '../repositories/banner.repository';
import { BannerService } from './banner.service';

describe('BannerService', () => {
  let service: BannerService;
  let repository: jest.Mocked<BannerRepository>;
  let redis: jest.Mocked<RedisService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  const mockBanner = {
    id: 1,
    placement: 'HERO_SLIDER' as const,
    title: 'Hero',
    imageUrl: 'https://example.com/hero.jpg',
    categoryId: 10,
    isActive: true,
    sortOrder: 0,
    category: { id: 10, name: 'Shoes', slug: 'shoes' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BannerService,
        {
          provide: BannerRepository,
          useValue: {
            findAllActivePublic: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findCategoryStatusById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            deleteById: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getOrSet: jest.fn().mockImplementation((key, ttl, factory) => factory()),
            deleteByPattern: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            write: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(BannerService);
    repository = module.get(BannerRepository);
    redis = module.get(RedisService);
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findActivePublic', () => {
    it('should fetch data through redis cache wrapper', async () => {
      repository.findAllActivePublic.mockResolvedValue([mockBanner]);
      const result = await service.findActivePublic();
      expect(result).toEqual([mockBanner]);
      expect(redis.getOrSet).toHaveBeenCalled();
      expect(repository.findAllActivePublic).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findAll', () => {
    it('should return all banners from repository', async () => {
      repository.findAll.mockResolvedValue([mockBanner]);
      const result = await service.findAll({ isActive: true });
      expect(result).toEqual([mockBanner]);
      expect(repository.findAll).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('findById', () => {
    it('should return banner when found', async () => {
      repository.findById.mockResolvedValue(mockBanner);
      await expect(service.findById(1)).resolves.toEqual(mockBanner);
    });

    it('should throw NotFoundException when banner is missing', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create banner, invalidate cache and write success audit log', async () => {
      repository.findCategoryStatusById.mockResolvedValue({
        id: 10,
        isActive: true,
        deletedAt: null,
      });
      repository.create.mockResolvedValue(mockBanner);
      const result = await service.create({
        placement: 'HERO_SLIDER',
        imageUrl: mockBanner.imageUrl,
        categoryId: 10,
      });
      expect(result).toEqual(mockBanner);
      expect(repository.create).toHaveBeenCalledWith({
        placement: 'HERO_SLIDER',
        title: null,
        imageUrl: mockBanner.imageUrl,
        categoryId: 10,
        isActive: true,
        sortOrder: 0,
      });
      expect(redis.deleteByPattern).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'banner.create',
          status: 'SUCCESS',
        }),
      );
    });

    it('should throw NotFoundException when category does not exist', async () => {
      repository.findCategoryStatusById.mockResolvedValue(null);
      await expect(
        service.create({
          placement: 'HERO_SLIDER',
          imageUrl: mockBanner.imageUrl,
          categoryId: 999,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'banner.create',
          status: 'FAILED',
        }),
      );
    });

    it('should throw BadRequestException when category is deleted', async () => {
      repository.findCategoryStatusById.mockResolvedValue({
        id: 10,
        isActive: true,
        deletedAt: new Date(),
      });
      await expect(
        service.create({
          placement: 'HERO_SLIDER',
          imageUrl: mockBanner.imageUrl,
          categoryId: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on unique violation', async () => {
      repository.findCategoryStatusById.mockResolvedValue({
        id: 10,
        isActive: true,
        deletedAt: null,
      });
      const uniqueError = new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      });
      repository.create.mockRejectedValue(uniqueError);
      await expect(
        service.create({
          placement: 'HERO_SLIDER',
          imageUrl: mockBanner.imageUrl,
          categoryId: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update banner and write success audit', async () => {
      repository.findById.mockResolvedValue(mockBanner);
      repository.findCategoryStatusById.mockResolvedValue({
        id: 10,
        isActive: true,
        deletedAt: null,
      });
      repository.update.mockResolvedValue({ ...mockBanner, title: 'Updated title' });
      const result = await service.update(
        1,
        { title: 'Updated title', categoryId: 10, isActive: false },
        { actorId: 1 },
      );
      expect(result.title).toBe('Updated title');
      expect(repository.update).toHaveBeenCalledWith(1, {
        title: 'Updated title',
        categoryId: 10,
        isActive: false,
      });
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'banner.update',
          status: 'SUCCESS',
        }),
      );
    });

    it('should write failed audit when update throws', async () => {
      repository.findById.mockResolvedValue(mockBanner);
      repository.update.mockRejectedValue(new Error('Update failed'));
      await expect(service.update(1, { title: 'Fail' })).rejects.toThrow('Update failed');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'banner.update',
          status: 'FAILED',
        }),
      );
    });
  });

  describe('deletePermanent', () => {
    it('should delete banner and write success audit', async () => {
      repository.findById.mockResolvedValue(mockBanner);
      repository.deleteById.mockResolvedValue(undefined);
      await expect(service.deletePermanent(1, { actorId: 2 })).resolves.toBeUndefined();
      expect(repository.deleteById).toHaveBeenCalledWith(1);
      expect(redis.deleteByPattern).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'banner.delete',
          status: 'SUCCESS',
        }),
      );
    });

    it('should write failed audit when delete throws', async () => {
      repository.findById.mockResolvedValue(mockBanner);
      repository.deleteById.mockRejectedValue(new Error('Delete failed'));
      await expect(service.deletePermanent(1)).rejects.toThrow('Delete failed');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'banner.delete',
          status: 'FAILED',
        }),
      );
    });
  });
});
