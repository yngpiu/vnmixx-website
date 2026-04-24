import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CityView {
  id: number;
  giaohangnhanhId: string;
  name: string;
}

export interface DistrictView {
  id: number;
  giaohangnhanhId: string;
  name: string;
  cityId: number;
}

export interface WardView {
  id: number;
  giaohangnhanhId: string;
  name: string;
  districtId: number;
}

const CITY_SELECT = {
  id: true,
  giaohangnhanhId: true,
  name: true,
} as const;

const DISTRICT_SELECT = {
  id: true,
  giaohangnhanhId: true,
  name: true,
  cityId: true,
} as const;

const WARD_SELECT = {
  id: true,
  giaohangnhanhId: true,
  name: true,
  districtId: true,
} as const;

@Injectable()
// Repository Prisma cho các thao tác đọc dữ liệu địa chỉ.
export class LocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy toàn bộ tỉnh/thành và sắp xếp theo tên tăng dần.
  async findAllCities(): Promise<CityView[]> {
    return this.prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: CITY_SELECT,
    });
  }

  // Lấy quận/huyện theo cityId và sắp xếp theo tên tăng dần.
  async findDistrictsByCityId(cityId: number): Promise<DistrictView[]> {
    return this.prisma.district.findMany({
      where: { cityId },
      orderBy: { name: 'asc' },
      select: DISTRICT_SELECT,
    });
  }

  // Lấy phường/xã theo districtId và sắp xếp theo tên tăng dần.
  async findWardsByDistrictId(districtId: number): Promise<WardView[]> {
    return this.prisma.ward.findMany({
      where: { districtId },
      orderBy: { name: 'asc' },
      select: WARD_SELECT,
    });
  }

  // Kiểm tra thành phố có tồn tại theo id hay không.
  async cityExists(id: number): Promise<boolean> {
    const count = await this.prisma.city.count({ where: { id } });
    return count > 0;
  }

  // Kiểm tra quận/huyện có tồn tại theo id hay không.
  async districtExists(id: number): Promise<boolean> {
    const count = await this.prisma.district.count({ where: { id } });
    return count > 0;
  }

  // Kiểm tra quận/huyện có thuộc thành phố truyền vào hay không.
  async districtBelongsToCity(districtId: number, cityId: number): Promise<boolean> {
    const count = await this.prisma.district.count({ where: { id: districtId, cityId } });
    return count > 0;
  }

  // Kiểm tra phường/xã có thuộc quận/huyện truyền vào hay không.
  async wardBelongsToDistrict(wardId: number, districtId: number): Promise<boolean> {
    const count = await this.prisma.ward.count({ where: { id: wardId, districtId } });
    return count > 0;
  }
}
