import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcrypt';
import { EmployeeStatus } from '../../../generated/prisma/client';
import type { LoginDto } from '../dto';
import { EmployeeRepository } from '../repositories/employee.repository';

interface EmployeeAuthIdentity {
  id: number;
  email: string;
  fullName: string;
}

export interface EmployeeAuthResult {
  user: EmployeeAuthIdentity;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class EmployeeAuthService {
  constructor(private readonly employeeRepo: EmployeeRepository) {}

  /** Authenticate an employee and return identity with roles/permissions. */
  async loginEmployee(dto: LoginDto): Promise<EmployeeAuthResult> {
    const employee = await this.employeeRepo.findByEmail(dto.email);
    if (!employee || employee.deletedAt) {
      throw new UnauthorizedException('Email hoặc mật khẩu không hợp lệ');
    }
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }
    const isPasswordValid = await compare(dto.password, employee.hashedPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không hợp lệ');
    }
    const { roles, permissions } = await this.employeeRepo.loadPermissions(employee.id);

    return {
      user: { id: employee.id, email: employee.email, fullName: employee.fullName },
      roles,
      permissions,
    };
  }
}
