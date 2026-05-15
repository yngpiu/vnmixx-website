import { Injectable } from '@nestjs/common';
import { type PermissionView, PermissionRepository } from '../repositories/permission.repository';

@Injectable()
// Xử lý nghiệp vụ truy xuất danh sách quyền RBAC.
export class PermissionService {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  // Lấy toàn bộ quyền để phục vụ giao diện quản trị vai trò.
  async findAll(): Promise<PermissionView[]> {
    return this.permissionRepo.findAll();
  }
}
