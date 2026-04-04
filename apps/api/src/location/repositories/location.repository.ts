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
export class LocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCities(): Promise<CityView[]> {
    return this.prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: CITY_SELECT,
    });
  }

  async findDistrictsByCityId(cityId: number): Promise<DistrictView[]> {
    return this.prisma.district.findMany({
      where: { cityId },
      orderBy: { name: 'asc' },
      select: DISTRICT_SELECT,
    });
  }

  async findWardsByDistrictId(districtId: number): Promise<WardView[]> {
    return this.prisma.ward.findMany({
      where: { districtId },
      orderBy: { name: 'asc' },
      select: WARD_SELECT,
    });
  }

  async cityExists(id: number): Promise<boolean> {
    const count = await this.prisma.city.count({ where: { id } });
    return count > 0;
  }

  async districtExists(id: number): Promise<boolean> {
    const count = await this.prisma.district.count({ where: { id } });
    return count > 0;
  }

  async districtBelongsToCity(districtId: number, cityId: number): Promise<boolean> {
    const count = await this.prisma.district.count({ where: { id: districtId, cityId } });
    return count > 0;
  }

  async wardBelongsToDistrict(wardId: number, districtId: number): Promise<boolean> {
    const count = await this.prisma.ward.count({ where: { id: wardId, districtId } });
    return count > 0;
  }
}
