import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionRepository } from './permission.repository';

describe('PermissionRepository', () => {
  let repository: PermissionRepository;
  const mockPrismaService = {
    permission: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionRepository, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();
    repository = module.get<PermissionRepository>(PermissionRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAll', () => {
    it('should query all permissions sorted by name', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      await repository.findAll();

      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true },
      });
    });
  });

  describe('existAll', () => {
    it('should return true when all ids exist', async () => {
      mockPrismaService.permission.count.mockResolvedValue(2);

      const actualResult = await repository.existAll([1, 2]);

      expect(actualResult).toBe(true);
      expect(mockPrismaService.permission.count).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
    });

    it('should return false when some ids do not exist', async () => {
      mockPrismaService.permission.count.mockResolvedValue(1);

      const actualResult = await repository.existAll([1, 2]);

      expect(actualResult).toBe(false);
    });
  });
});
