import { Module } from '@nestjs/common';
import { CustomerProfileController } from './controllers/customer-profile.controller';
import { EmployeeProfileController } from './controllers/employee-profile.controller';
import { CustomerProfileRepository } from './repositories/customer.repository';
import { EmployeeProfileRepository } from './repositories/employee.repository';
import { ProfileService } from './services/profile.service';

@Module({
  controllers: [CustomerProfileController, EmployeeProfileController],
  providers: [ProfileService, CustomerProfileRepository, EmployeeProfileRepository],
})
export class ProfileModule {}
