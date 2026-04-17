import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MediaAdminController } from './controllers/media-admin.controller';
import { MediaRepository } from './repositories/media.repository';
import { MediaService } from './services/media.service';

@Module({
  imports: [AuditLogModule],
  controllers: [MediaAdminController],
  providers: [MediaService, MediaRepository],
  exports: [MediaService],
})
export class MediaModule {}
