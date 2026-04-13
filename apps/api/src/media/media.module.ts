import { Module } from '@nestjs/common';
import { MediaAdminController } from './controllers/media-admin.controller';
import { MediaRepository } from './repositories/media.repository';
import { MediaService } from './services/media.service';

@Module({
  controllers: [MediaAdminController],
  providers: [MediaService, MediaRepository],
  exports: [MediaService],
})
export class MediaModule {}
