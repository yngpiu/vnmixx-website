import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface AddressView {
  id: number;
  fullName: string;
  phoneNumber: string;
  addressLine: string;
  type: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  city: { id: number; name: string };
  district: { id: number; name: string };
  ward: { id: number; name: string };
}

const ADDRESS_SELECT = {
  id: true,
  fullName: true,
  phoneNumber: true,
  addressLine: true,
  type: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  city: { select: { id: true, name: true } },
  district: { select: { id: true, name: true } },
  ward: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCustomerId(customerId: number): Promise<AddressView[]> {
    return this.prisma.address.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: ADDRESS_SELECT,
    }) as unknown as Promise<AddressView[]>;
  }

  async findById(id: number, customerId: number): Promise<AddressView | null> {
    return this.prisma.address.findFirst({
      where: { id, customerId },
      select: ADDRESS_SELECT,
    }) as unknown as Promise<AddressView | null>;
  }

  async create(data: {
    customerId: number;
    fullName: string;
    phoneNumber: string;
    cityId: number;
    districtId: number;
    wardId: number;
    addressLine: string;
    type: 'HOME' | 'OFFICE';
    isDefault: boolean;
  }): Promise<AddressView> {
    return this.prisma.address.create({
      data,
      select: ADDRESS_SELECT,
    }) as unknown as Promise<AddressView>;
  }

  async update(
    id: number,
    data: {
      fullName?: string;
      phoneNumber?: string;
      cityId?: number;
      districtId?: number;
      wardId?: number;
      addressLine?: string;
      type?: 'HOME' | 'OFFICE';
    },
  ): Promise<AddressView> {
    return this.prisma.address.update({
      where: { id },
      data,
      select: ADDRESS_SELECT,
    }) as unknown as Promise<AddressView>;
  }

  async clearDefault(customerId: number): Promise<void> {
    await this.prisma.address.updateMany({
      where: { customerId, isDefault: true },
      data: { isDefault: false },
    });
  }

  async setDefault(id: number): Promise<void> {
    await this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async countByCustomerId(customerId: number): Promise<number> {
    return this.prisma.address.count({
      where: { customerId },
    });
  }
}
