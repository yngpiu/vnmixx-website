import { Injectable } from '@nestjs/common';
import { type PermissionView, PermissionRepository } from '../repositories/permission.repository';

@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  async findAll(): Promise<PermissionView[]> {
    return this.permissionRepo.findAll();
  }
}
