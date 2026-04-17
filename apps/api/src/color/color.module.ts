import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ColorAdminController } from './controllers/color-admin.controller';
import { ColorController } from './controllers/color.controller';
import { ColorRepository } from './repositories/color.repository';
import { ColorService } from './services/color.service';

@Module({
  imports: [AuditLogModule],
  controllers: [ColorController, ColorAdminController],
  providers: [ColorService, ColorRepository],
})
export class ColorModule {}
