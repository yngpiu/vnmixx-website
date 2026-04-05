import { Module } from '@nestjs/common';
import { EmployeeAdminController } from './controllers/employee-admin.controller';
import { EmployeeRepository } from './repositories/employee.repository';
import { EmployeeService } from './services/employee.service';

@Module({
  controllers: [EmployeeAdminController],
  providers: [EmployeeService, EmployeeRepository],
})
export class EmployeeModule {}
