import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { RedisService } from '../../redis/services/redis.service';
import { ColorRepository } from '../repositories/color.repository';
import { ColorService } from './color.service';

describe('ColorService', () => {
  let service: ColorService;
  let repository: jest.Mocked<ColorRepository>;
  let redis: jest.Mocked<RedisService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockColor = {
    id: 1,
    name: 'Red',
    hexCode: '#FF0000',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColorService,
        {
          provide: ColorRepository,
          useValue: {
            findAllPublic: jest.fn(),
            findAll: jest.fn(),
            findList: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findById: jest.fn(),
            hasVariants: jest.fn(),
            hasImages: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getOrSet: jest.fn().mockImplementation((key, ttl, factory) => factory()),
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

    service = module.get<ColorService>(ColorService);
    repository = module.get(ColorRepository);
    redis = module.get(RedisService);
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPublic', () => {
    it('should return all colors from repository via redis getOrSet', async () => {
      repository.findAllPublic.mockResolvedValue([mockColor]);
      const result = await service.findAllPublic();
      expect(result).toEqual([mockColor]);
      expect(repository.findAllPublic).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all colors', async () => {
      repository.findAll.mockResolvedValue([mockColor]);
      const result = await service.findAll();
      expect(result).toEqual([mockColor]);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('findList', () => {
    it('should return paginated list', async () => {
      const paginated = { items: [mockColor], total: 1, page: 1, limit: 10, totalPages: 1 };
      repository.findList.mockResolvedValue(paginated);
      const result = await service.findList({ page: 1, limit: 10 });
      expect(result).toEqual(paginated);
    });
  });

  describe('create', () => {
    it('should create and write audit log', async () => {
      const dto = { name: 'Blue', hexCode: '#0000FF' };
      repository.create.mockResolvedValue({ ...mockColor, ...dto });

      const result = await service.create(dto);

      expect(result.name).toBe('Blue');
      expect(redis.del).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalled();
    });

    it('should handle unique violation', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2002',
        clientVersion: '1',
        meta: { target: ['hexCode'] },
      });
      repository.create.mockRejectedValue(error);

      await expect(service.create({ name: 'Blue', hexCode: '#0000FF' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update and write audit log', async () => {
      repository.findById.mockResolvedValue(mockColor);
      repository.update.mockResolvedValue({ ...mockColor, name: 'Crimson' });

      const result = await service.update(1, { name: 'Crimson' });

      expect(result.name).toBe('Crimson');
      expect(redis.del).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalled();
    });

    it('should throw NotFoundException if color not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(1, { name: 'Crimson' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove if not in use', async () => {
      repository.findById.mockResolvedValue(mockColor);
      repository.hasVariants.mockResolvedValue(false);
      repository.hasImages.mockResolvedValue(false);

      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
      expect(redis.del).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalled();
    });

    it('should throw ConflictException if in use by variants', async () => {
      repository.findById.mockResolvedValue(mockColor);
      repository.hasVariants.mockResolvedValue(true);
      repository.hasImages.mockResolvedValue(false);

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if in use by images', async () => {
      repository.findById.mockResolvedValue(mockColor);
      repository.hasVariants.mockResolvedValue(false);
      repository.hasImages.mockResolvedValue(true);

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });
  });
});
