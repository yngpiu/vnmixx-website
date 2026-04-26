import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { EmployeeAdminController } from './controllers/employee-admin.controller';
import { EmployeeRepository } from './repositories/employee.repository';
import { EmployeeService } from './services/employee.service';

@Module({
  imports: [RbacModule, AuthModule, AuditLogModule],
  controllers: [EmployeeAdminController],
  providers: [EmployeeService, EmployeeRepository],
})
// Module quản lý nhân viên - Kết nối controller, service và repository.
export class EmployeeModule {}
