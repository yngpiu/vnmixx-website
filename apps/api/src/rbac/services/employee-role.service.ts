import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RefreshTokenRepository } from '../../auth/repositories/refresh-token.repository';
import {
  type EmployeeWithRoles,
  EmployeeRoleRepository,
} from '../repositories/employee-role.repository';
import { RoleRepository } from '../repositories/role.repository';

// Service xử lý việc gán và gỡ vai trò cho tài khoản nhân viên
@Injectable()
export class EmployeeRoleService {
  constructor(
    private readonly employeeRoleRepo: EmployeeRoleRepository,
    private readonly roleRepo: RoleRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {}

  // Lấy danh sách vai trò hiện tại của một nhân viên
  async findByEmployeeId(employeeId: number): Promise<EmployeeWithRoles> {
    const result = await this.employeeRoleRepo.findByEmployeeId(employeeId);
    if (!result) throw new NotFoundException(`Không tìm thấy nhân viên #${employeeId}`);
    return result;
  }

  // Kiểm tra danh sách ID vai trò có tồn tại hay không trước khi thực hiện các tác vụ khác
  async ensureRoleIdsExist(roleIds: number[]): Promise<void> {
    if (roleIds.length) await this.validateRoleIds(roleIds);
  }

  // Đồng bộ lại danh sách vai trò cho nhân viên và thu hồi các phiên đăng nhập cũ để áp dụng quyền mới
  async syncRoles(employeeId: number, roleIds: number[]): Promise<EmployeeWithRoles> {
    const exists = await this.employeeRoleRepo.employeeExists(employeeId);
    if (!exists) throw new NotFoundException(`Không tìm thấy nhân viên #${employeeId}`);

    const uniqueRoleIds = [...new Set(roleIds)];

    if (uniqueRoleIds.length) {
      await this.validateRoleIds(uniqueRoleIds);
    }

    // Xóa các vai trò cũ và tạo mới các liên kết vai trò trong transaction
    await this.employeeRoleRepo.syncRoles(employeeId, uniqueRoleIds);

    // Thu hồi refresh tokens để nhân viên buộc phải đăng nhập lại hoặc lấy accessToken mới với quyền mới
    await this.refreshTokenRepo.revokeAllByUser(employeeId, 'EMPLOYEE');

    return this.findByEmployeeId(employeeId);
  }

  // Kiểm tra tính hợp lệ của các ID vai trò trong hệ thống
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
