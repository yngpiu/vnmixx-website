import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../../redis/services/redis.service';
import { AUTH_CACHE_KEYS } from '../auth.cache';
import { EmployeeRepository } from '../repositories/employee.repository';
import { EmployeeAuthzCacheService } from './employee-authz-cache.service';

describe('EmployeeAuthzCacheService', () => {
  let service: EmployeeAuthzCacheService;
  let employeeRepo: jest.Mocked<EmployeeRepository>;

  const mockRedisClient = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  const mockEmployeeRepo = {
    loadPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeAuthzCacheService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: EmployeeRepository, useValue: mockEmployeeRepo },
      ],
    }).compile();

    service = module.get<EmployeeAuthzCacheService>(EmployeeAuthzCacheService);
    employeeRepo = module.get(EmployeeRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRolesAndPermissions', () => {
    const employeeId = 1;
    const cacheKey = AUTH_CACHE_KEYS.EMPLOYEE_AUTHZ(employeeId);
    const mockSnapshot = {
      roles: ['ADMIN'],
      permissions: ['read:all'],
    };

    it('should return cached value if present in redis', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSnapshot));

      const result = await service.getRolesAndPermissions(employeeId);

      expect(result).toEqual(mockSnapshot);
      expect(mockRedisClient.get).toHaveBeenCalledWith(cacheKey);
      expect(employeeRepo.loadPermissions).not.toHaveBeenCalled();
    });

    it('should load from repo and cache if not in redis', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      employeeRepo.loadPermissions.mockResolvedValue(mockSnapshot);

      const result = await service.getRolesAndPermissions(employeeId);

      expect(result).toEqual(mockSnapshot);
      expect(employeeRepo.loadPermissions).toHaveBeenCalledWith(employeeId);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        cacheKey,
        expect.any(Number),
        JSON.stringify(mockSnapshot),
      );
    });
  });

  describe('invalidate', () => {
    it('should delete key from redis', async () => {
      const employeeId = 1;
      const cacheKey = AUTH_CACHE_KEYS.EMPLOYEE_AUTHZ(employeeId);

      await service.invalidate(employeeId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('invalidateMany', () => {
    it('should do nothing if empty array provided', async () => {
      await service.invalidateMany([]);

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should delete multiple keys from redis', async () => {
      const ids = [1, 2, 2, 3];
      const keys = [
        AUTH_CACHE_KEYS.EMPLOYEE_AUTHZ(1),
        AUTH_CACHE_KEYS.EMPLOYEE_AUTHZ(2),
        AUTH_CACHE_KEYS.EMPLOYEE_AUTHZ(3),
      ];

      await service.invalidateMany(ids);

      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });
  });
});
