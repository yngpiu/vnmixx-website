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

/**
 * Repository xử lý các truy vấn liên quan đến nhân viên (Employee) dành riêng cho xác thực.
 * Chịu trách nhiệm lấy thông tin tài khoản, mật khẩu băm và quyền hạn từ cơ sở dữ liệu.
 */
@Injectable()
export class EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tìm nhân viên bằng email để phục vụ logic đăng nhập.
   */
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

  /**
   * Tìm nhân viên bằng ID để xác thực thông tin cơ bản sau khi giải mã JWT.
   */
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

  /**
   * Tải danh sách vai trò (Roles) và quyền hạn (Permissions) của nhân viên.
   * Kết quả này thường được cache để tối ưu hiệu năng.
   */
  async loadPermissions(employeeId: number): Promise<EmployeePermissions> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    if (!employee?.role) {
      return { roles: [], permissions: [] };
    }

    const roles = [employee.role.name];
    const permissionSet = new Set<string>();
    for (const rp of employee.role.rolePermissions) {
      permissionSet.add(rp.permission.name);
    }
    return { roles, permissions: [...permissionSet] };
  }

  /**
   * Lấy mật khẩu đã băm của nhân viên theo ID.
   */
  async findHashedPasswordById(employeeId: number): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, deletedAt: null },
      select: { hashedPassword: true },
    });
    return employee?.hashedPassword ?? null;
  }

  /**
   * Cập nhật mật khẩu mới cho nhân viên.
   */
  async updatePassword(employeeId: number, hashedPassword: string): Promise<boolean> {
    const { count } = await this.prisma.employee.updateMany({
      where: { id: employeeId, deletedAt: null },
      data: { hashedPassword },
    });
    return count > 0;
  }
}
