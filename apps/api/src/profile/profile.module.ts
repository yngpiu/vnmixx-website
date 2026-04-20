import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { CustomerProfileController } from './controllers/customer-profile.controller';
import { EmployeeProfileController } from './controllers/employee-profile.controller';
import { CustomerProfileRepository } from './repositories/customer.repository';
import { EmployeeProfileRepository } from './repositories/employee.repository';
import { ProfileService } from './services/profile.service';

/**
 * Module hồ sơ người dùng (Profile).
 * Quản lý thông tin cá nhân và thay đổi mật khẩu cho cả khách hàng và nhân viên.
 */
@Module({
  imports: [AuditLogModule, AuthModule],
  controllers: [CustomerProfileController, EmployeeProfileController],
  providers: [ProfileService, CustomerProfileRepository, EmployeeProfileRepository],
})
export class ProfileModule {}
