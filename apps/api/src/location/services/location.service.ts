import { Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_KEYS, CACHE_TTL } from '../../redis/cache-keys';
import { RedisService } from '../../redis/redis.service';
import {
  type CityView,
  type DistrictView,
  LocationRepository,
  type WardView,
} from '../repositories/location.repository';

@Injectable()
export class LocationService {
  constructor(
    private readonly locationRepo: LocationRepository,
    private readonly redis: RedisService,
  ) {}

  async findAllCities(): Promise<CityView[]> {
    return this.redis.getOrSet(CACHE_KEYS.CITIES, CACHE_TTL.LOCATION, () =>
      this.locationRepo.findAllCities(),
    );
  }

  async findDistrictsByCityId(cityId: number): Promise<DistrictView[]> {
    const exists = await this.locationRepo.cityExists(cityId);
    if (!exists) throw new NotFoundException(`Không tìm thấy thành phố #${cityId}`);

    return this.redis.getOrSet(CACHE_KEYS.DISTRICTS(cityId), CACHE_TTL.LOCATION, () =>
      this.locationRepo.findDistrictsByCityId(cityId),
    );
  }

  async findWardsByDistrictId(districtId: number): Promise<WardView[]> {
    const exists = await this.locationRepo.districtExists(districtId);
    if (!exists) throw new NotFoundException(`Không tìm thấy quận/huyện #${districtId}`);

    return this.redis.getOrSet(CACHE_KEYS.WARDS(districtId), CACHE_TTL.LOCATION, () =>
      this.locationRepo.findWardsByDistrictId(districtId),
    );
  }
}
