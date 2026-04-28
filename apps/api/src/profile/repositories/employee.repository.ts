// Repository quản lý truy vấn dữ liệu hồ sơ Nhân viên.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface EmployeeProfileView {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  userType: 'EMPLOYEE';
  roles: string[];
  permissions: string[];
  createdAt: Date;
}

export interface UpdateEmployeeProfileData {
  fullName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
}

@Injectable()
export class EmployeeProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<EmployeeProfileView | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        avatarUrl: true,
        createdAt: true,
        role: {
          select: {
            name: true,
            rolePermissions: {
              select: {
                permission: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!employee) return null;

    return {
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      phoneNumber: employee.phoneNumber,
      avatarUrl: employee.avatarUrl,
      userType: 'EMPLOYEE',
      roles: employee.role ? [employee.role.name] : [],
      permissions: employee.role
        ? [...new Set(employee.role.rolePermissions.map((item) => item.permission.name))]
        : [],
      createdAt: employee.createdAt,
    };
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
