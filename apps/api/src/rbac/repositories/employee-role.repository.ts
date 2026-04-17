import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface EmployeeWithRoles {
  employeeId: number;
  fullName: string;
  email: string;
  roles: { id: number; name: string; description: string | null }[];
}

// Repository quản lý liên kết giữa nhân viên và các vai trò
@Injectable()
export class EmployeeRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy danh sách thông tin nhân viên kèm các vai trò đang được gán
  async findByEmployeeId(employeeId: number): Promise<EmployeeWithRoles | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        fullName: true,
        email: true,
        employeeRoles: {
          select: {
            role: { select: { id: true, name: true, description: true } },
          },
        },
      },
    });

    if (!employee) return null;

    return {
      employeeId: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      roles: employee.employeeRoles.map((er) => er.role),
    };
  }

  // Cập nhật lại danh sách vai trò cho một nhân viên (Xóa cũ, thêm mới)
  async syncRoles(employeeId: number, roleIds: number[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.employeeRole.deleteMany({ where: { employeeId } }),
      ...(roleIds.length
        ? [
            this.prisma.employeeRole.createMany({
              data: roleIds.map((roleId) => ({ employeeId, roleId })),
            }),
          ]
        : []),
    ]);
  }

  // Kiểm tra xem nhân viên có tồn tại và chưa bị xóa hay không
  async employeeExists(employeeId: number): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: { id: employeeId, deletedAt: null },
    });
    return count === 1;
  }
}
