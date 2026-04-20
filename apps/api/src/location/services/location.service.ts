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
// Service quản lý dữ liệu địa chính: Tỉnh/Thành, Quận/Huyện, Phường/Xã
// Sử dụng Redis Cache để tối ưu hiệu năng truy xuất các dữ liệu ít thay đổi
export class LocationService {
  constructor(
    private readonly locationRepo: LocationRepository,
    private readonly redis: RedisService,
  ) {}

  // Lấy danh sách tất cả Tỉnh/Thành phố hiện có trong hệ thống
  async findAllCities(): Promise<CityView[]> {
    return this.redis.getOrSet(CACHE_KEYS.CITIES, CACHE_TTL.LOCATION, () =>
      this.locationRepo.findAllCities(),
    );
  }

  // Lấy danh sách Quận/Huyện dựa theo ID của Tỉnh/Thành phố
  async findDistrictsByCityId(cityId: number): Promise<DistrictView[]> {
    const exists = await this.locationRepo.cityExists(cityId);
    if (!exists) throw new NotFoundException(`Không tìm thấy thành phố #${cityId}`);

    return this.redis.getOrSet(CACHE_KEYS.DISTRICTS(cityId), CACHE_TTL.LOCATION, () =>
      this.locationRepo.findDistrictsByCityId(cityId),
    );
  }

  // Lấy danh sách Phường/Xã dựa theo ID của Quận/Huyện
  async findWardsByDistrictId(districtId: number): Promise<WardView[]> {
    const exists = await this.locationRepo.districtExists(districtId);
    if (!exists) throw new NotFoundException(`Không tìm thấy quận/huyện #${districtId}`);

    return this.redis.getOrSet(CACHE_KEYS.WARDS(districtId), CACHE_TTL.LOCATION, () =>
      this.locationRepo.findWardsByDistrictId(districtId),
    );
  }
}
