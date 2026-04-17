import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { CustomerAdminController } from './controllers/customer-admin.controller';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomerService } from './services/customer.service';

@Module({
  imports: [AuditLogModule],
  controllers: [CustomerAdminController],
  providers: [CustomerService, CustomerRepository],
})
export class CustomerModule {}
