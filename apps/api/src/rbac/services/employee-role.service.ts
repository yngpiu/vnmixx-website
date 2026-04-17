import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeAuthzCacheService } from '../../auth/services/employee-authz-cache.service';
import {
  type EmployeeWithRoles,
  EmployeeRoleRepository,
} from '../repositories/employee-role.repository';
import { RoleRepository } from '../repositories/role.repository';

@Injectable()
export class EmployeeRoleService {
  constructor(
    private readonly employeeRoleRepo: EmployeeRoleRepository,
    private readonly roleRepo: RoleRepository,
    private readonly employeeAuthzCache: EmployeeAuthzCacheService,
  ) {}

  async findByEmployeeId(employeeId: number): Promise<EmployeeWithRoles> {
    const result = await this.employeeRoleRepo.findByEmployeeId(employeeId);
    if (!result) throw new NotFoundException(`Không tìm thấy nhân viên #${employeeId}`);
    return result;
  }

  async ensureRoleIdsExist(roleIds: number[]): Promise<void> {
    if (roleIds.length) await this.validateRoleIds(roleIds);
  }

  async syncRoles(employeeId: number, roleIds: number[]): Promise<EmployeeWithRoles> {
    const exists = await this.employeeRoleRepo.employeeExists(employeeId);
    if (!exists) throw new NotFoundException(`Không tìm thấy nhân viên #${employeeId}`);

    const uniqueRoleIds = [...new Set(roleIds)];

    if (uniqueRoleIds.length) {
      await this.validateRoleIds(uniqueRoleIds);
    }

    await this.employeeRoleRepo.syncRoles(employeeId, uniqueRoleIds);
    await this.employeeAuthzCache.invalidate(employeeId);
    return this.findByEmployeeId(employeeId);
  }

  async invalidateEmployeeAuthzCache(employeeId: number): Promise<void> {
    await this.employeeAuthzCache.invalidate(employeeId);
  }

  private async validateRoleIds(ids: number[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    const roles = await this.roleRepo.findAll();
    const existingIds = new Set(roles.map((r) => r.id));
    const invalid = uniqueIds.filter((id) => !existingIds.has(id));
    if (invalid.length) {
      throw new BadRequestException(`Các ID vai trò không tồn tại: ${invalid.join(', ')}`);
    }
  }
}
