import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module';
import { EmployeeAdminController } from './controllers/employee-admin.controller';
import { EmployeeRepository } from './repositories/employee.repository';
import { EmployeeService } from './services/employee.service';

@Module({
  imports: [RbacModule],
  controllers: [EmployeeAdminController],
  providers: [EmployeeService, EmployeeRepository],
})
export class EmployeeModule {}
