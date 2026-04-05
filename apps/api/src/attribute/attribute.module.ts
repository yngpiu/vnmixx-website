import { Module } from '@nestjs/common';
import { AttributeAdminController } from './controllers/attribute-admin.controller';
import { AttributeRepository } from './repositories/attribute.repository';
import { AttributeService } from './services/attribute.service';

@Module({
  controllers: [AttributeAdminController],
  providers: [AttributeService, AttributeRepository],
})
export class AttributeModule {}
