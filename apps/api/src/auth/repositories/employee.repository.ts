import { Injectable } from '@nestjs/common';
import { EmployeeStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface EmployeeAuthView {
  id: number;
  email: string;
  fullName: string;
  hashedPassword: string;
  status: EmployeeStatus;
  deletedAt: Date | null;
}

interface EmployeeValidationView {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  status: EmployeeStatus;
  deletedAt: Date | null;
}

interface EmployeePermissions {
  roles: string[];
  permissions: string[];
}

@Injectable()
export class EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<EmployeeAuthView | null> {
    return this.prisma.employee.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        hashedPassword: true,
        status: true,
        deletedAt: true,
      },
    });
  }

  async findById(id: number): Promise<EmployeeValidationView | null> {
    return this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        status: true,
        deletedAt: true,
      },
    });
  }

  async loadPermissions(employeeId: number): Promise<EmployeePermissions> {
    const employeeRoles = await this.prisma.employeeRole.findMany({
      where: { employeeId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
    const roles = employeeRoles.map((er) => er.role.name);
    const permissionSet = new Set<string>();
    for (const er of employeeRoles) {
      for (const rp of er.role.rolePermissions) {
        permissionSet.add(rp.permission.name);
      }
    }
    return { roles, permissions: [...permissionSet] };
  }

  async findHashedPasswordById(employeeId: number): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, deletedAt: null },
      select: { hashedPassword: true },
    });
    return employee?.hashedPassword ?? null;
  }

  async updatePassword(employeeId: number, hashedPassword: string): Promise<boolean> {
    const { count } = await this.prisma.employee.updateMany({
      where: { id: employeeId, deletedAt: null },
      data: { hashedPassword },
    });
    return count > 0;
  }
}
