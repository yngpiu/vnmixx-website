import { Injectable } from '@nestjs/common';
import { type PermissionView, PermissionRepository } from '../repositories/permission.repository';

// Service xử lý danh sách quyền hạn hệ thống
@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  // Lấy tất cả các quyền hạn đang có trong hệ thống
  async findAll(): Promise<PermissionView[]> {
    return this.permissionRepo.findAll();
  }
}
