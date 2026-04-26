// Repository quản lý truy vấn dữ liệu hồ sơ Khách hàng.
import { Injectable } from '@nestjs/common';
import type { Gender } from 'generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface CustomerProfileView {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  dob: Date | null;
  gender: Gender | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface UpdateCustomerProfileData {
  fullName?: string;
  dob?: Date | null;
  gender?: Gender | null;
  avatarUrl?: string;
}

const CUSTOMER_PROFILE_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  dob: true,
  gender: true,
  avatarUrl: true,
  createdAt: true,
} as const;

@Injectable()
export class CustomerProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<CustomerProfileView | null> {
    return this.prisma.customer.findUnique({
      where: { id, deletedAt: null },
      select: CUSTOMER_PROFILE_SELECT,
    });
  }

  async update(id: number, data: UpdateCustomerProfileData): Promise<CustomerProfileView | null> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, deletedAt: null },
      data,
    });
    if (count === 0) return null;
    return this.findById(id);
  }
}
