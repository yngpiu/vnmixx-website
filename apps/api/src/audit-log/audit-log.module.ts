import { Module } from '@nestjs/common';
import { AuditLogAdminController } from './controllers/audit-log-admin.controller';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLogService } from './services/audit-log.service';

@Module({
  controllers: [AuditLogAdminController],
  providers: [AuditLogService, AuditLogRepository],
  exports: [AuditLogService],
})
export class AuditLogModule {}
