import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuditLogStatus, EmployeeStatus, Prisma } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { EmployeeAuthzCacheService } from '../../auth/services/employee-authz-cache.service';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { RedisService } from '../../redis/services/redis.service';
import { EmployeeRepository } from '../repositories/employee.repository';
import { EmployeeService } from './employee.service';

jest.mock('bcrypt');

describe('EmployeeService', () => {
  let service: EmployeeService;
  let employeeRepo: jest.Mocked<EmployeeRepository>;
  let roleRepo: jest.Mocked<RoleRepository>;
  let employeeAuthzCache: jest.Mocked<EmployeeAuthzCacheService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: EmployeeRepository,
          useValue: {
            findList: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            restore: jest.fn(),
          },
        },
        {
          provide: RoleRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: EmployeeAuthzCacheService,
          useValue: {
            invalidate: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            write: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getOrSet: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    employeeRepo = module.get(EmployeeRepository);
    roleRepo = module.get(RoleRepository);
    employeeAuthzCache = module.get(EmployeeAuthzCacheService);
    auditLogService = module.get(AuditLogService);
    redis = module.get(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findList', () => {
    it('should return paginated list', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      employeeRepo.findList.mockResolvedValue(result);

      expect(await service.findList({ page: 1, limit: 10 })).toBe(result);
    });
  });

  describe('findById', () => {
    it('should return employee if found (via cache)', async () => {
      const employee = { id: 1 } as any;
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById.mockResolvedValue(employee);

      expect(await service.findById(1)).toBe(employee);
      expect(redis.getOrSet).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      phoneNumber: '123456789',
      roleId: 1,
    };

    it('should create employee and hash password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      roleRepo.findById.mockResolvedValue({ id: 1 } as any);
      const createdEmployee = { id: 2, ...dto } as any;
      employeeRepo.create.mockResolvedValue(createdEmployee);

      const result = await service.create(dto);

      expect(result).toBe(createdEmployee);
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should throw BadRequestException if role does not exist', async () => {
      roleRepo.findById.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.FAILED }),
      );
    });

    it('should handle unique violation error for email', async () => {
      roleRepo.findById.mockResolvedValue({ id: 1 } as any);
      const error = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: 'x',
        meta: { target: 'email' },
      });
      employeeRepo.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException('Email này đã được đăng ký cho một nhân viên khác'),
      );
    });

    it('should handle unique violation error for phone', async () => {
      roleRepo.findById.mockResolvedValue({ id: 1 } as any);
      const error = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: 'x',
        meta: { target: 'phone' },
      });
      employeeRepo.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException('Số điện thoại này đã được sử dụng'),
      );
    });

    it('should handle generic unique violation error', async () => {
      roleRepo.findById.mockResolvedValue({ id: 1 } as any);
      const error = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: 'x',
        meta: { target: 'unknown' },
      });
      employeeRepo.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException('Thông tin nhân viên bị trùng lặp dữ liệu duy nhất'),
      );
    });
  });

  describe('update', () => {
    const id = 2;
    const dto = { status: EmployeeStatus.ACTIVE, roleId: 2 };

    it('should update employee and invalidate cache', async () => {
      const beforeData = { id, status: EmployeeStatus.INACTIVE } as any;
      const afterData = { id, status: EmployeeStatus.ACTIVE } as any;

      // Mock findById to use cache
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById.mockResolvedValueOnce(beforeData).mockResolvedValueOnce(afterData);

      roleRepo.findById.mockResolvedValue({ id: 2 } as any);
      employeeRepo.update.mockResolvedValue(afterData);

      const result = await service.update(id, dto);

      expect(result).toBe(afterData);
      expect(employeeAuthzCache.invalidate).toHaveBeenCalledWith(id);
      expect(redis.del).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should throw BadRequestException if no update data provided', async () => {
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById.mockResolvedValue({ id } as any);

      await expect(service.update(id, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new role does not exist', async () => {
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById.mockResolvedValue({ id } as any);
      roleRepo.findById.mockResolvedValue(null);

      await expect(service.update(id, { roleId: 999 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete and invalidate cache', async () => {
      const id = 2;
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById
        .mockResolvedValueOnce({ id } as any)
        .mockResolvedValueOnce({ id, deletedAt: new Date() } as any);
      employeeRepo.softDelete.mockResolvedValue(true);

      await service.softDelete(id, {}, 3);

      expect(employeeRepo.softDelete).toHaveBeenCalledWith(id);
      expect(employeeAuthzCache.invalidate).toHaveBeenCalledWith(id);
      expect(redis.del).toHaveBeenCalled();
    });

    it('should throw BadRequestException if deleting super admin (ID 1)', async () => {
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById.mockResolvedValue({ id: 1 } as any);

      await expect(service.softDelete(1)).rejects.toThrow(
        'Không được phép xóa tài khoản quản trị tối cao của hệ thống',
      );
    });

    it('should throw BadRequestException if deleting self', async () => {
      const id = 2;
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById.mockResolvedValue({ id } as any);

      await expect(service.softDelete(id, {}, id)).rejects.toThrow(
        'Bạn không thể tự xóa tài khoản của chính mình',
      );
    });

    it('should throw NotFoundException if employee to delete not found', async () => {
      const id = 2;
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById.mockResolvedValue({ id } as any);
      employeeRepo.softDelete.mockResolvedValue(false);

      await expect(service.softDelete(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore employee and invalidate cache', async () => {
      const id = 2;
      const restored = { id, deletedAt: null } as any;
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById.mockResolvedValueOnce({ id } as any);
      employeeRepo.restore.mockResolvedValue(restored);

      const result = await service.restore(id);

      expect(result).toBe(restored);
      expect(employeeAuthzCache.invalidate).toHaveBeenCalledWith(id);
      expect(redis.del).toHaveBeenCalled();
    });

    it('should throw BadRequestException if restoration fails', async () => {
      const id = 2;
      redis.getOrSet.mockImplementation(async (_key, _ttl, cb) => cb());
      employeeRepo.findById.mockResolvedValueOnce({ id } as any);
      employeeRepo.restore.mockResolvedValue(null);

      await expect(service.restore(id)).rejects.toThrow(BadRequestException);
    });
  });
});
