import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { RedisService } from '../../redis/redis.service';
import { CreateSizeDto, PaginatedSizeList, UpdateSizeDto } from '../dto';
import { SizeAdminView, SizeRepository, SizeView } from '../repositories/size.repository';
import { SizeService } from './size.service';

describe('SizeService', () => {
  let service: SizeService;
  let repository: jest.Mocked<SizeRepository>;
  let redis: jest.Mocked<RedisService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockSize: SizeAdminView = {
    id: 1,
    label: 'M',
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SizeService,
        {
          provide: SizeRepository,
          useValue: {
            findAllPublic: jest.fn(),
            findAll: jest.fn(),
            findList: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findById: jest.fn(),
            hasVariants: jest.fn(),
          },
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
        {
          provide: AuditLogService,
          useValue: {
            write: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SizeService>(SizeService);
    repository = module.get(SizeRepository);
    redis = module.get(RedisService);
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPublic', () => {
    it('should return all sizes from repository via redis getOrSet', async () => {
      const sizes: SizeView[] = [mockSize];
      repository.findAllPublic.mockResolvedValue(sizes);
      const result = await service.findAllPublic();
      expect(result).toEqual(sizes);
      expect(repository.findAllPublic).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all sizes', async () => {
      const sizes: SizeAdminView[] = [mockSize];
      repository.findAll.mockResolvedValue(sizes);
      const result = await service.findAll();
      expect(result).toEqual(sizes);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('findList', () => {
    it('should return paginated list', async () => {
      const paginated: PaginatedSizeList = {
        data: [mockSize],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      repository.findList.mockResolvedValue(paginated);
      const result = await service.findList({ page: 1, limit: 10 });
      expect(result).toEqual(paginated);
    });
  });

  describe('create', () => {
    const dto: CreateSizeDto = { label: 'L', sortOrder: 2 };

    it('should create and write audit log', async () => {
      repository.create.mockResolvedValue({ ...mockSize, ...dto });

      const result = await service.create(dto);

      expect(result.label).toBe('L');
      expect(redis.del).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalled();
    });

    it('should handle unique violation', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2002',
        clientVersion: '1',
      });
      repository.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const dto: UpdateSizeDto = { label: 'L' };

    it('should update and write audit log', async () => {
      repository.findById.mockResolvedValue(mockSize);
      repository.update.mockResolvedValue({ ...mockSize, label: 'L' });

      const result = await service.update(1, dto);

      expect(result.label).toBe('L');
      expect(redis.del).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalled();
    });

    it('should throw NotFoundException if size not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(1, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove if not in use', async () => {
      repository.findById.mockResolvedValue(mockSize);
      repository.hasVariants.mockResolvedValue(false);

      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
      expect(redis.del).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalled();
    });

    it('should throw ConflictException if in use', async () => {
      repository.findById.mockResolvedValue(mockSize);
      repository.hasVariants.mockResolvedValue(true);

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });
  });
});
