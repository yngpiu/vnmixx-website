import { Module } from '@nestjs/common';
import { CustomerAdminController } from './controllers/customer-admin.controller';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomerService } from './services/customer.service';

@Module({
  controllers: [CustomerAdminController],
  providers: [CustomerService, CustomerRepository],
})
export class CustomerModule {}
