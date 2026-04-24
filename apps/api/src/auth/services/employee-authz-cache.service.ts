import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/services/redis.service';
import { AUTH_CACHE_KEYS, AUTH_CACHE_TTL } from '../auth.cache';
import { EmployeeRepository } from '../repositories/employee.repository';

interface EmployeeAuthzSnapshot {
  readonly roles: string[];
  readonly permissions: string[];
}

/**
 * Caches employee role names and permission names for JWT validation.
 * Call invalidate / invalidateMany when RBAC or employee roles change; TTL is a long fallback only.
 */
@Injectable()
export class EmployeeAuthzCacheService {
  private readonly logger = new Logger(EmployeeAuthzCacheService.name);
  private readonly ttlSeconds: number = AUTH_CACHE_TTL.EMPLOYEE_AUTHZ;

  constructor(
    private readonly redis: RedisService,
    private readonly employeeRepo: EmployeeRepository,
  ) {}

  /** Returns roles and permissions, using Redis when possible. */
  async getRolesAndPermissions(employeeId: number): Promise<EmployeeAuthzSnapshot> {
    const key = AUTH_CACHE_KEYS.EMPLOYEE_AUTHZ(employeeId);
    const cached = await this.redis.getClient().get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as EmployeeAuthzSnapshot;
      } catch (error) {
        this.logger.warn(
          `Dữ liệu cache quyền nhân viên #${employeeId} bị lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        await this.redis.getClient().del(key);
      }
    }
    const loaded = await this.employeeRepo.loadPermissions(employeeId);
    const snapshot: EmployeeAuthzSnapshot = {
      roles: loaded.roles,
      permissions: loaded.permissions,
    };
    await this.redis.getClient().setex(key, this.ttlSeconds, JSON.stringify(snapshot));
    return snapshot;
  }

  /** Drop cached authz for one employee. */
  async invalidate(employeeId: number): Promise<void> {
    await this.redis.getClient().del(AUTH_CACHE_KEYS.EMPLOYEE_AUTHZ(employeeId));
  }

  /** Drop cached authz for many employees (e.g. after role permission sync). */
  async invalidateMany(employeeIds: readonly number[]): Promise<void> {
    const uniqueIds = [...new Set(employeeIds)];
    if (!uniqueIds.length) {
      return;
    }
    const keys = uniqueIds.map((id) => AUTH_CACHE_KEYS.EMPLOYEE_AUTHZ(id));
    await this.redis.getClient().del(...keys);
  }
}
