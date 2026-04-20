/**
 * Repository quản lý truy vấn dữ liệu hồ sơ Nhân viên.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface EmployeeProfileView {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface UpdateEmployeeProfileData {
  fullName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
}

const EMPLOYEE_PROFILE_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  avatarUrl: true,
  createdAt: true,
} as const;

@Injectable()
export class EmployeeProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<EmployeeProfileView | null> {
    return this.prisma.employee.findUnique({
      where: { id, deletedAt: null },
      select: EMPLOYEE_PROFILE_SELECT,
    });
  }

  async update(id: number, data: UpdateEmployeeProfileData): Promise<EmployeeProfileView | null> {
    const { count } = await this.prisma.employee.updateMany({
      where: { id, deletedAt: null },
      data,
    });
    if (count === 0) return null;
    return this.findById(id);
  }
}
