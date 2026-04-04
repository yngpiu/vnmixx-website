import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmployeeRoleController } from './controllers/employee-role.controller';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { EmployeeRoleRepository } from './repositories/employee-role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { RoleRepository } from './repositories/role.repository';
import { EmployeeRoleService } from './services/employee-role.service';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';

@Module({
  imports: [AuthModule],
  controllers: [RoleController, PermissionController, EmployeeRoleController],
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
