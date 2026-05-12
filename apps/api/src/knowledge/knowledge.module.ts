import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { KnowledgeAdminController } from './controllers/knowledge-admin.controller';
import { KnowledgeRepository } from './repositories/knowledge.repository';
import { KnowledgeService } from './services/knowledge.service';

@Module({
  imports: [AuditLogModule],
  controllers: [KnowledgeAdminController],
  providers: [KnowledgeService, KnowledgeRepository],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
