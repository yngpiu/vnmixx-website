import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { EmployeeAuthzCacheService } from '../../auth/services/employee-authz-cache.service';
import { PermissionRepository } from '../repositories/permission.repository';
import { RoleRepository } from '../repositories/role.repository';
import { RoleService } from './role.service';

describe('RoleService', () => {
  let service: RoleService;
  let roleRepo: jest.Mocked<RoleRepository>;
  let permissionRepo: jest.Mocked<PermissionRepository>;
  let employeeAuthzCache: jest.Mocked<EmployeeAuthzCacheService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockRoleRepo = {
    findList: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    syncPermissions: jest.fn(),
    findEmployeeIdsByRoleId: jest.fn(),
  };

  const mockPermissionRepo = {
    existAll: jest.fn(),
  };

  const mockEmployeeAuthzCache = {
    invalidateMany: jest.fn(),
  };

  const mockAuditLogService = {
    write: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: RoleRepository, useValue: mockRoleRepo },
        { provide: PermissionRepository, useValue: mockPermissionRepo },
        { provide: EmployeeAuthzCacheService, useValue: mockEmployeeAuthzCache },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    roleRepo = module.get(RoleRepository);
    permissionRepo = module.get(PermissionRepository);
    employeeAuthzCache = module.get(EmployeeAuthzCacheService);
    auditLogService = module.get(AuditLogService);
  });

  describe('findList', () => {
    it('should call roleRepo.findList', async () => {
      const params = { page: 1, limit: 10 };
      await service.findList(params);
      expect(roleRepo.findList).toHaveBeenCalledWith(params);
    });
  });

  describe('findById', () => {
    it('should return role if found', async () => {
      const role = { id: 1, name: 'Role' };
      roleRepo.findById.mockResolvedValue(role as any);
      const result = await service.findById(1);
      expect(result).toEqual(role);
    });

    it('should throw NotFoundException if role not found', async () => {
      roleRepo.findById.mockResolvedValue(null);
      await expect(service.findById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { name: 'New Role', description: 'Desc', permissionIds: [1, 2] };

    it('should create role and log success', async () => {
      permissionRepo.existAll.mockResolvedValue(true);
      const createdRole = { id: 1, ...dto };
      roleRepo.create.mockResolvedValue(createdRole as any);

      const result = await service.create(dto);

      expect(result).toEqual(createdRole);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'role.create', status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should throw BadRequestException if permissions do not exist', async () => {
      permissionRepo.existAll.mockResolvedValue(false);
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on unique violation', async () => {
      permissionRepo.existAll.mockResolvedValue(true);
      const error = new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2002',
        clientVersion: 'v',
      });
      roleRepo.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const id = 1;
    const dto = { name: 'Updated Role', permissionIds: [3] };
    const existingRole = { id, name: 'Old Role' };

    it('should update role name and description and permissions', async () => {
      roleRepo.findById.mockResolvedValue(existingRole as any);
      roleRepo.update.mockResolvedValue({ ...existingRole, name: dto.name } as any);
      permissionRepo.existAll.mockResolvedValue(true);
      roleRepo.syncPermissions.mockResolvedValue({
        ...existingRole,
        name: dto.name,
        permissions: [],
      } as any);
      roleRepo.findEmployeeIdsByRoleId.mockResolvedValue([101]);

      const result = await service.update(id, dto);

      expect(result).toBeDefined();
      expect(roleRepo.syncPermissions).toHaveBeenCalled();
      expect(employeeAuthzCache.invalidateMany).toHaveBeenCalledWith([101]);
    });

    it('should update role without changing permissions if permissionIds is undefined', async () => {
      roleRepo.findById.mockResolvedValue(existingRole as any);
      const updatedRole = { ...existingRole, name: 'New Name' };
      roleRepo.update.mockResolvedValue(updatedRole as any);

      const result = await service.update(id, { name: 'New Name' });

      expect(result).toEqual(updatedRole);
      expect(roleRepo.syncPermissions).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if trying to rename "Chủ cửa hàng"', async () => {
      roleRepo.findById.mockResolvedValue({ id, name: 'Chủ cửa hàng' } as any);
      await expect(service.update(id, { name: 'New Name' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if permissionIds is not an array of integers', async () => {
      roleRepo.findById.mockResolvedValue(existingRole as any);
      await expect(service.update(id, { permissionIds: 'not-an-array' as any })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log failure and rethrow error on update failure', async () => {
      roleRepo.findById.mockResolvedValue(existingRole as any);
      const error = new Error('Update failed');
      roleRepo.update.mockRejectedValue(error);

      await expect(service.update(id, { name: 'Fail' })).rejects.toThrow(error);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'role.update', status: AuditLogStatus.FAILED }),
      );
    });

    it('should handle unique violation on update', async () => {
      roleRepo.findById.mockResolvedValue(existingRole as any);
      const error = new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2002',
        clientVersion: 'v',
      });
      roleRepo.update.mockRejectedValue(error);

      await expect(service.update(id, { name: 'Existing Name' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when prisma reports missing role on update', async () => {
      roleRepo.findById.mockResolvedValue(existingRole as any);
      const error = new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2025',
        clientVersion: 'v',
      });
      roleRepo.update.mockRejectedValue(error);
      await expect(service.update(id, { name: 'Role Name' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete role and invalidate cache', async () => {
      const role = { id: 1, name: 'Regular Role' };
      roleRepo.findById.mockResolvedValue(role as any);
      roleRepo.findEmployeeIdsByRoleId.mockResolvedValue([]);
      roleRepo.delete.mockResolvedValue(undefined);

      await service.delete(1);

      expect(roleRepo.delete).toHaveBeenCalledWith(1);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'role.delete', status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should log failure and rethrow error on delete failure', async () => {
      const role = { id: 1, name: 'Regular Role' };
      roleRepo.findById.mockResolvedValue(role as any);
      const error = new Error('Delete failed');
      roleRepo.delete.mockRejectedValue(error);

      await expect(service.delete(1)).rejects.toThrow(error);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'role.delete', status: AuditLogStatus.FAILED }),
      );
    });

    it('should throw BadRequestException if role is "Chủ cửa hàng"', async () => {
      roleRepo.findById.mockResolvedValue({ id: 1, name: 'Chủ cửa hàng' } as any);
      await expect(service.delete(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if role has employees', async () => {
      roleRepo.findById.mockResolvedValue({ id: 1, name: 'Role' } as any);
      roleRepo.findEmployeeIdsByRoleId.mockResolvedValue([1]);
      await expect(service.delete(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when prisma reports missing role on delete', async () => {
      const role = { id: 1, name: 'Regular Role' };
      roleRepo.findById.mockResolvedValue(role as any);
      roleRepo.findEmployeeIdsByRoleId.mockResolvedValue([]);
      const error = new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2025',
        clientVersion: 'v',
      });
      roleRepo.delete.mockRejectedValue(error);
      await expect(service.delete(1)).rejects.toThrow(NotFoundException);
    });
  });
});
