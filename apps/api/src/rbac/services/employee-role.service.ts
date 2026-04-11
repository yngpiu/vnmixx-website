import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RefreshTokenRepository } from '../../auth/repositories/refresh-token.repository';
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
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {}

  async findByEmployeeId(employeeId: number): Promise<EmployeeWithRoles> {
    const result = await this.employeeRoleRepo.findByEmployeeId(employeeId);
    if (!result) throw new NotFoundException(`Không tìm thấy nhân viên #${employeeId}`);
    return result;
  }

  /** Kiểm tra mọi ID vai trò tồn tại (dùng trước khi tạo nhân viên để tránh bản ghi không có vai trò khi ID sai). */
  async ensureRoleIdsExist(roleIds: number[]): Promise<void> {
    if (roleIds.length) await this.validateRoleIds(roleIds);
  }

  async syncRoles(employeeId: number, roleIds: number[]): Promise<EmployeeWithRoles> {
    const exists = await this.employeeRoleRepo.employeeExists(employeeId);
    if (!exists) throw new NotFoundException(`Không tìm thấy nhân viên #${employeeId}`);

    if (roleIds.length) {
      await this.validateRoleIds(roleIds);
    }

    await this.employeeRoleRepo.syncRoles(employeeId, roleIds);
    await this.refreshTokenRepo.revokeAllByUser(employeeId, 'EMPLOYEE');

    return this.findByEmployeeId(employeeId);
  }

  private async validateRoleIds(ids: number[]): Promise<void> {
    const roles = await this.roleRepo.findAll();
    const existingIds = new Set(roles.map((r) => r.id));
    const invalid = ids.filter((id) => !existingIds.has(id));
    if (invalid.length) {
      throw new BadRequestException(`Các ID vai trò không tồn tại: ${invalid.join(', ')}`);
    }
  }
}
