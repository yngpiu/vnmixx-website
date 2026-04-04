import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type CityView,
  type DistrictView,
  LocationRepository,
  type WardView,
} from '../repositories/location.repository';

@Injectable()
export class LocationService {
  constructor(private readonly locationRepo: LocationRepository) {}

  async findAllCities(): Promise<CityView[]> {
    return this.locationRepo.findAllCities();
  }

  async findDistrictsByCityId(cityId: number): Promise<DistrictView[]> {
    const exists = await this.locationRepo.cityExists(cityId);
    if (!exists) throw new NotFoundException(`City #${cityId} not found`);
    return this.locationRepo.findDistrictsByCityId(cityId);
  }

  async findWardsByDistrictId(districtId: number): Promise<WardView[]> {
    const exists = await this.locationRepo.districtExists(districtId);
    if (!exists) throw new NotFoundException(`District #${districtId} not found`);
    return this.locationRepo.findWardsByDistrictId(districtId);
  }
}
