import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { R2Module } from '../r2/r2.module';
import { RedisModule } from '../redis/redis.module';
import { MediaAdminController } from './controllers/media-admin.controller';
import { MediaCustomerController } from './controllers/media-customer.controller';
import { MediaRepository } from './repositories/media.repository';
import { MediaService } from './services/media.service';

@Module({
  imports: [AuditLogModule, RedisModule, R2Module],
  controllers: [MediaAdminController, MediaCustomerController],
  providers: [MediaService, MediaRepository],
  exports: [MediaService],
})
export class MediaModule {}
