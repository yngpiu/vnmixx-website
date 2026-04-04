import { Module } from '@nestjs/common';
import { LocationController } from './controllers/location.controller';
import { LocationRepository } from './repositories/location.repository';
import { LocationService } from './services/location.service';

@Module({
  controllers: [LocationController],
  providers: [LocationService, LocationRepository],
  exports: [LocationRepository],
})
export class LocationModule {}
