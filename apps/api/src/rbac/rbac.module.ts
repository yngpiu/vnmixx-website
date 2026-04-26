import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { PermissionRepository } from './repositories/permission.repository';
import { RoleRepository } from './repositories/role.repository';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';

// Module tập hợp đầy đủ controller, service và repository cho RBAC.
@Module({
  imports: [AuthModule, AuditLogModule, RedisModule],
  exports: [RoleRepository],
  controllers: [RoleController, PermissionController],
  providers: [RoleService, PermissionService, RoleRepository, PermissionRepository],
})
export class RbacModule {}
