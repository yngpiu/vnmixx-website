import { Module } from '@nestjs/common';
import { SizeAdminController } from './controllers/size-admin.controller';
import { SizeController } from './controllers/size.controller';
import { SizeRepository } from './repositories/size.repository';
import { SizeService } from './services/size.service';

@Module({
  controllers: [SizeController, SizeAdminController],
  providers: [SizeService, SizeRepository],
})
export class SizeModule {}
