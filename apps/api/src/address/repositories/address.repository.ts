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
// Repository Prisma cho các thao tác liên quan đến sổ địa chỉ của khách hàng.
export class AddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy danh sách địa chỉ của khách hàng, ưu tiên địa chỉ mặc định và ngày tạo mới nhất.
  async findAllByCustomerId(customerId: number): Promise<AddressView[]> {
    return this.prisma.address.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: ADDRESS_SELECT,
    }) as unknown as Promise<AddressView[]>;
  }

  // Tìm một địa chỉ theo ID và ID khách hàng.
  async findById(id: number, customerId: number): Promise<AddressView | null> {
    return this.prisma.address.findFirst({
      where: { id, customerId },
      select: ADDRESS_SELECT,
    }) as unknown as Promise<AddressView | null>;
  }

  // Tạo địa chỉ mới cho khách hàng.
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

  // Cập nhật thông tin địa chỉ theo ID.
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
      isDefault?: boolean;
    },
  ): Promise<AddressView> {
    return this.prisma.address.update({
      where: { id },
      data,
      select: ADDRESS_SELECT,
    }) as unknown as Promise<AddressView>;
  }

  // Đếm tổng số địa chỉ hiện có của khách hàng.
  async countByCustomerId(customerId: number): Promise<number> {
    return this.prisma.address.count({
      where: { customerId },
    });
  }
}
