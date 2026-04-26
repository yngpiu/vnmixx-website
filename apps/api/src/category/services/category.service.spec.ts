import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { RedisService } from '../../redis/services/redis.service';
import { CategoryRepository } from '../repositories/category.repository';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: jest.Mocked<CategoryRepository>;
  let redis: jest.Mocked<RedisService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockCategory = {
    id: 1,
    name: 'Test Category',
    slug: 'test-category',
    isFeatured: false,
    isActive: true,
    sortOrder: 0,
    parentId: null,
    parent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: CategoryRepository,
          useValue: {
            findActiveTree: jest.fn(),
            findAllActive: jest.fn(),
            findBySlug: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findDepthChain: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateAndCascadeDeactivateDescendants: jest.fn(),
            softDelete: jest.fn(),
            restore: jest.fn(),
            hasActiveChildren: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getOrSet: jest.fn().mockImplementation((key, ttl, factory) => factory()),
            del: jest.fn(),
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

    service = module.get<CategoryService>(CategoryService);
    repository = module.get(CategoryRepository);
    redis = module.get(RedisService);
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findActiveTree', () => {
    it('should call repository via redis getOrSet', async () => {
      const tree = [{ ...mockCategory, children: [] }];
      repository.findActiveTree.mockResolvedValue(tree);

      const result = await service.findActiveTree();

      expect(result).toEqual(tree);
      expect(repository.findActiveTree).toHaveBeenCalled();
    });
  });

  describe('findActiveFlat', () => {
    it('should call repository via redis getOrSet', async () => {
      const flat = [mockCategory];
      repository.findAllActive.mockResolvedValue(flat);

      const result = await service.findActiveFlat();

      expect(result).toEqual(flat);
      expect(repository.findAllActive).toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('should return category from repository via redis getOrSet', async () => {
      repository.findBySlug.mockResolvedValue({ ...mockCategory, children: [] });

      const result = await service.findBySlug('test-category');

      expect(result).toEqual({ ...mockCategory, children: [] });
      expect(repository.findBySlug).toHaveBeenCalledWith('test-category');
    });

    it('should throw NotFoundException if category not found', async () => {
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.findBySlug('not-found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should call repository.findAll', async () => {
      repository.findAll.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(result).toEqual([mockCategory]);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return category if found', async () => {
      repository.findById.mockResolvedValue(mockCategory);

      const result = await service.findById(1);

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a category and write audit log', async () => {
      const dto = { name: 'New', slug: 'new' };
      repository.create.mockResolvedValue({ ...mockCategory, ...dto });

      const result = await service.create(dto);

      expect(result.name).toBe('New');
      expect(repository.create).toHaveBeenCalled();
      expect(redis.deleteByPattern).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'category.create',
          status: 'SUCCESS',
        }),
      );
    });

    it('should throw and log on unique violation', async () => {
      const dto = { name: 'New', slug: 'new' };
      const error = new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2002',
        clientVersion: '1',
      });
      repository.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'category.create',
          status: 'FAILED',
        }),
      );
    });

    it('should validate parent depth before create', async () => {
      const dto = { name: 'New', slug: 'new', parentId: 2 };
      repository.findById.mockResolvedValue({ ...mockCategory, id: 2 }); // parent exists
      repository.findDepthChain
        .mockResolvedValueOnce({ id: 2, parentId: 3 })
        .mockResolvedValueOnce({ id: 3, parentId: 4 })
        .mockResolvedValueOnce({ id: 4, parentId: null });
      // depth will be 3, depth + 1 = 4 > MAX_DEPTH (3)

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if parent not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.create({ name: 'New', slug: 'new', parentId: 999 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if parent is deleted', async () => {
      repository.findById.mockResolvedValue({ ...mockCategory, id: 2, deletedAt: new Date() });
      await expect(service.create({ name: 'New', slug: 'new', parentId: 2 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if parent is inactive', async () => {
      repository.findById.mockResolvedValue({ ...mockCategory, id: 2, isActive: false });
      await expect(service.create({ name: 'New', slug: 'new', parentId: 2 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update and write audit log', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      repository.update.mockResolvedValue({ ...mockCategory, name: 'Updated' });

      const result = await service.update(1, { name: 'Updated' });

      expect(result.name).toBe('Updated');
      expect(auditLogService.write).toHaveBeenCalled();
    });

    it('should cascade deactivate if isActive set to false', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      repository.updateAndCascadeDeactivateDescendants.mockResolvedValue({
        ...mockCategory,
        isActive: false,
      });

      await service.update(1, { isActive: false });

      expect(repository.updateAndCascadeDeactivateDescendants).toHaveBeenCalled();
    });

    it('should prevent updating parent to itself', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      await expect(service.update(1, { parentId: 1 })).rejects.toThrow(BadRequestException);
    });

    it('should prevent circular references', async () => {
      repository.findById.mockImplementation((id) => {
        if (id === 1) return Promise.resolve(mockCategory);
        if (id === 2) return Promise.resolve({ ...mockCategory, id: 2 } as any);
        return Promise.resolve(null);
      });

      // In validateParentForCreate(2)
      repository.findDepthChain.mockResolvedValueOnce({ id: 2, parentId: null });

      // In validateNoCircularRef(1, 2)
      repository.findDepthChain.mockResolvedValueOnce({ id: 2, parentId: 1 });

      await expect(service.update(1, { parentId: 2 })).rejects.toThrow(BadRequestException);
    });

    it('should handle errors and log failure', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      repository.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.update(1, { name: 'Fail' })).rejects.toThrow('Update failed');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('should delete if no active children', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      repository.hasActiveChildren.mockResolvedValue(false);

      await service.softDelete(1);

      expect(repository.softDelete).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalled();
    });

    it('should throw if has active children', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      repository.hasActiveChildren.mockResolvedValue(true);

      await expect(service.softDelete(1)).rejects.toThrow(ConflictException);
    });

    it('should log failure on error', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      repository.hasActiveChildren.mockRejectedValue(new Error('DB error'));

      await expect(service.softDelete(1)).rejects.toThrow('DB error');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
        }),
      );
    });
  });

  describe('restore', () => {
    it('should restore if deleted', async () => {
      const deletedCategory = { ...mockCategory, deletedAt: new Date() };
      repository.findById.mockResolvedValue(deletedCategory);
      repository.restore.mockResolvedValue(mockCategory);

      const result = await service.restore(1);

      expect(result.deletedAt).toBeNull();
      expect(repository.restore).toHaveBeenCalled();
    });

    it('should throw if not deleted', async () => {
      repository.findById.mockResolvedValue(mockCategory);

      await expect(service.restore(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw if parent is deleted', async () => {
      const deletedCategory = { ...mockCategory, parentId: 2, deletedAt: new Date() };
      repository.findById.mockImplementation((id) => {
        if (id === 1) return Promise.resolve(deletedCategory);
        if (id === 2)
          return Promise.resolve({ ...mockCategory, id: 2, deletedAt: new Date() } as any);
        return Promise.resolve(null);
      });

      await expect(service.restore(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw if parent is inactive', async () => {
      const deletedCategory = { ...mockCategory, parentId: 2, deletedAt: new Date() };
      repository.findById.mockImplementation((id) => {
        if (id === 1) return Promise.resolve(deletedCategory);
        if (id === 2) return Promise.resolve({ ...mockCategory, id: 2, isActive: false } as any);
        return Promise.resolve(null);
      });

      await expect(service.restore(1)).rejects.toThrow(BadRequestException);
    });

    it('should log failure on error', async () => {
      repository.findById.mockResolvedValueOnce(mockCategory); // beforeSnapshot
      repository.findById.mockRejectedValue(new Error('Restore failed')); // inside try

      await expect(service.restore(1)).rejects.toThrow('Restore failed');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
        }),
      );
    });
  });
});
