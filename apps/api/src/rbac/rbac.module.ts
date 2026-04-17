import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { EmployeeRoleRepository } from './repositories/employee-role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { RoleRepository } from './repositories/role.repository';
import { EmployeeRoleService } from './services/employee-role.service';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';

// Module quản lý phân quyền dựa trên vai trò (Role-Based Access Control)
@Module({
  imports: [AuthModule, AuditLogModule],
  exports: [EmployeeRoleService],
  controllers: [RoleController, PermissionController],
  providers: [
    RoleService,
    PermissionService,
    EmployeeRoleService,
    RoleRepository,
    PermissionRepository,
    EmployeeRoleRepository,
  ],
})
export class RbacModule {}
