import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleRepository } from './role.repository';

describe('RoleRepository', () => {
  let repository: RoleRepository;
  const mockPrismaService = {
    $transaction: jest.fn(),
    role: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleRepository, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();
    repository = module.get<RoleRepository>(RoleRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findList', () => {
    it('should return paginated list', async () => {
      const row = {
        id: 1,
        name: 'Admin',
        description: 'Full access',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        _count: { rolePermissions: 2 },
      };
      mockPrismaService.$transaction.mockResolvedValue([1, [row]]);

      const actualResult = await repository.findList({ page: 1, limit: 20 });

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(actualResult).toEqual({
        data: [
          {
            id: 1,
            name: 'Admin',
            description: 'Full access',
            permissionCount: 2,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });
  });

  describe('findById', () => {
    it('should return role details with permissions', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 1,
        name: 'Admin',
        description: 'Full access',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        rolePermissions: [
          { permission: { id: 10, name: 'rbac.read', description: 'Read RBAC resources' } },
        ],
      });

      const actualResult = await repository.findById(1);

      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });
      expect(actualResult).toEqual({
        id: 1,
        name: 'Admin',
        description: 'Full access',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        permissions: [{ id: 10, name: 'rbac.read', description: 'Read RBAC resources' }],
      });
    });
  });

  describe('create', () => {
    it('should create role and return detail view', async () => {
      mockPrismaService.role.create.mockResolvedValue({
        id: 2,
        name: 'Editor',
        description: null,
        createdAt: new Date('2026-01-03'),
        updatedAt: new Date('2026-01-03'),
        rolePermissions: [],
      });

      const actualResult = await repository.create({ name: 'Editor', permissionIds: [1, 2] });

      expect(mockPrismaService.role.create).toHaveBeenCalledWith({
        data: {
          name: 'Editor',
          description: undefined,
          rolePermissions: {
            createMany: { data: [{ permissionId: 1 }, { permissionId: 2 }] },
          },
        },
        select: expect.any(Object),
      });
      expect(actualResult.name).toBe('Editor');
    });
  });

  describe('update', () => {
    it('should update role basic fields', async () => {
      mockPrismaService.role.update.mockResolvedValue({
        id: 3,
        name: 'Supervisor',
        description: null,
        createdAt: new Date('2026-01-04'),
        updatedAt: new Date('2026-01-05'),
        rolePermissions: [],
      });

      const actualResult = await repository.update(3, { name: 'Supervisor' });

      expect(mockPrismaService.role.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { name: 'Supervisor' },
        select: expect.any(Object),
      });
      expect(actualResult.id).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete role by id', async () => {
      mockPrismaService.role.delete.mockResolvedValue(undefined);

      await repository.delete(4);

      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({ where: { id: 4 } });
    });
  });

  describe('syncPermissions', () => {
    it('should replace permissions and return updated role', async () => {
      mockPrismaService.role.findUniqueOrThrow.mockResolvedValue({
        id: 5,
        name: 'Manager',
        description: null,
        createdAt: new Date('2026-01-05'),
        updatedAt: new Date('2026-01-06'),
        rolePermissions: [{ permission: { id: 1, name: 'rbac.read', description: null } }],
      });

      const actualResult = await repository.syncPermissions(5, [1]);

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.role.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 5 },
        select: expect.any(Object),
      });
      expect(actualResult.permissions).toEqual([{ id: 1, name: 'rbac.read', description: null }]);
    });
  });

  describe('findEmployeeIdsByRoleId', () => {
    it('should return employee id list for role', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);

      const actualResult = await repository.findEmployeeIdsByRoleId(8);

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith({
        where: { roleId: 8 },
        select: { id: true },
      });
      expect(actualResult).toEqual([11, 12]);
    });
  });
});
