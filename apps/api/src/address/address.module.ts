import { Module } from '@nestjs/common';
import { LocationModule } from '../location/location.module';
import { AddressController } from './controllers/address.controller';
import { AddressRepository } from './repositories/address.repository';
import { AddressService } from './services/address.service';

@Module({
  imports: [LocationModule],
  controllers: [AddressController],
  providers: [AddressService, AddressRepository],
})
export class AddressModule {}
