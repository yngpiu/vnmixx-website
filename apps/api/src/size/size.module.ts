import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SizeAdminController } from './controllers/size-admin.controller';
import { SizeController } from './controllers/size.controller';
import { SizeRepository } from './repositories/size.repository';
import { SizeService } from './services/size.service';

@Module({
  imports: [AuditLogModule],
  controllers: [SizeController, SizeAdminController],
  providers: [SizeService, SizeRepository],
})
export class SizeModule {}
