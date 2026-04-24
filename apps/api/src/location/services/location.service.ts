import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '../../redis/services/redis.service';
import { LOCATION_CACHE_KEYS, LOCATION_CACHE_TTL } from '../location.cache';
import {
  type CityView,
  type DistrictView,
  LocationRepository,
  type WardView,
} from '../repositories/location.repository';

@Injectable()
// Xử lý luồng đọc dữ liệu địa chỉ theo chiến lược ưu tiên cache.
export class LocationService {
  constructor(
    private readonly locationRepo: LocationRepository,
    private readonly redis: RedisService,
  ) {}

  // Lấy danh sách tỉnh/thành và lưu cache để tái sử dụng.
  async findAllCities(): Promise<CityView[]> {
    return this.redis.getOrSet(LOCATION_CACHE_KEYS.CITIES, LOCATION_CACHE_TTL.LOCATION, () =>
      this.locationRepo.findAllCities(),
    );
  }

  // Kiểm tra thành phố tồn tại trước khi trả danh sách quận/huyện.
  async findDistrictsByCityId(cityId: number): Promise<DistrictView[]> {
    const exists = await this.locationRepo.cityExists(cityId);
    if (!exists) throw new NotFoundException(`Không tìm thấy tỉnh/thành phố #${cityId}`);

    return this.redis.getOrSet(
      LOCATION_CACHE_KEYS.DISTRICTS(cityId),
      LOCATION_CACHE_TTL.LOCATION,
      () => this.locationRepo.findDistrictsByCityId(cityId),
    );
  }

  // Kiểm tra quận/huyện tồn tại trước khi trả danh sách phường/xã.
  async findWardsByDistrictId(districtId: number): Promise<WardView[]> {
    const exists = await this.locationRepo.districtExists(districtId);
    if (!exists) throw new NotFoundException(`Không tìm thấy quận/huyện #${districtId}`);

    return this.redis.getOrSet(
      LOCATION_CACHE_KEYS.WARDS(districtId),
      LOCATION_CACHE_TTL.LOCATION,
      () => this.locationRepo.findWardsByDistrictId(districtId),
    );
  }
}
