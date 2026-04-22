import { Injectable } from '@nestjs/common';
import { type PermissionView, PermissionRepository } from '../repositories/permission.repository';

// Quản lý danh mục các quyền hạn (Permissions) định nghĩa sẵn trong hệ thống.
// Giúp admin dễ dàng lựa chọn và gán quyền cho các nhóm vai trò khác nhau.
@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  // Lấy toàn bộ danh sách quyền hạn hiện có để phục vụ giao diện cấu hình RBAC.
  async findAll(): Promise<PermissionView[]> {
    return this.permissionRepo.findAll();
  }
}
