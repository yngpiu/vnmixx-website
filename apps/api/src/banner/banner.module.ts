import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { BannerAdminController } from './controllers/banner-admin.controller';
import { BannerController } from './controllers/banner.controller';
import { BannerRepository } from './repositories/banner.repository';
import { BannerService } from './services/banner.service';

@Module({
  imports: [AuditLogModule],
  controllers: [BannerController, BannerAdminController],
  providers: [BannerService, BannerRepository],
})
export class BannerModule {}
