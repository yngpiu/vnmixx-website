import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/services/redis.service';
import { RBAC_CACHE_KEYS, RBAC_CACHE_TTL } from '../rbac.cache';
import { type PermissionView, PermissionRepository } from '../repositories/permission.repository';

@Injectable()
// Xử lý nghiệp vụ truy xuất danh sách quyền RBAC.
export class PermissionService {
  constructor(
    private readonly permissionRepo: PermissionRepository,
    private readonly redis: RedisService,
  ) {}

  // Lấy toàn bộ quyền để phục vụ giao diện quản trị vai trò.
  async findAll(): Promise<PermissionView[]> {
    return this.redis.getOrSet(RBAC_CACHE_KEYS.PERMISSIONS, RBAC_CACHE_TTL.PERMISSION, () =>
      this.permissionRepo.findAll(),
    );
  }
}
