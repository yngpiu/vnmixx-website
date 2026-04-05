import { Module } from '@nestjs/common';
import { ColorAdminController } from './controllers/color-admin.controller';
import { ColorController } from './controllers/color.controller';
import { ColorRepository } from './repositories/color.repository';
import { ColorService } from './services/color.service';

@Module({
  controllers: [ColorController, ColorAdminController],
  providers: [ColorService, ColorRepository],
})
export class ColorModule {}
