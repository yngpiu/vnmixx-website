import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { PermissionRepository } from './repositories/permission.repository';
import { RoleRepository } from './repositories/role.repository';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';

// Module quản lý phân quyền dựa trên vai trò (Role-Based Access Control)
@Module({
  imports: [AuthModule, AuditLogModule],
  exports: [RoleRepository],
  controllers: [RoleController, PermissionController],
  providers: [RoleService, PermissionService, RoleRepository, PermissionRepository],
})
export class RbacModule {}
