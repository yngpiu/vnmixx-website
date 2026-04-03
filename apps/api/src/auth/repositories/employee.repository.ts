import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface EmployeeAuthView {
  id: number;
  email: string;
  fullName: string;
  hashedPassword: string;
  isActive: boolean;
  deletedAt: Date | null;
}

interface EmployeeValidationView {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
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
        isActive: true,
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
        isActive: true,
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
}
