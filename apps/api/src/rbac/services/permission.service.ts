import { Injectable } from '@nestjs/common';
import { type PermissionView, PermissionRepository } from '../repositories/permission.repository';

/**
 * PermissionService: Chịu trách nhiệm quản lý danh mục các quyền hạn (Permissions) có sẵn trong hệ thống.
 * Các quyền hạn này thường là cố định và được định nghĩa trước (ví dụ: product.create, order.view).
 */
@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  /**
   * Lấy danh sách toàn bộ các quyền hạn hiện có trong hệ thống để phục vụ việc gán quyền cho vai trò.
   */
  async findAll(): Promise<PermissionView[]> {
    return this.permissionRepo.findAll();
  }
}
