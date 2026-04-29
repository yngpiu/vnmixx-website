import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { EmployeeStatus } from '../../../generated/prisma/client';
import { BCRYPT_SALT_ROUNDS } from '../constants';
import type { ChangePasswordDto, EmployeeLoginDto } from '../dto';
import { EmployeeRepository } from '../repositories/employee.repository';

interface EmployeeAuthIdentity {
  id: number;
  email: string;
  fullName: string;
}

export interface EmployeeAuthResult {
  user: EmployeeAuthIdentity;
}

@Injectable()
// Service xử lý logic xác thực cho Nhân viên (Employee).
// Quản lý quy trình đăng nhập và đổi mật khẩu cho các tài khoản quản trị/nhân viên.
export class EmployeeAuthService {
  constructor(private readonly employeeRepo: EmployeeRepository) {}

  // Đăng nhập nhân viên.
  // Logic: Kiểm tra email tồn tại -> Kiểm tra trạng thái ACTIVE -> So khớp mật khẩu băm.
  // Lưu ý: Vai trò (roles) và quyền (permissions) sẽ được xử lý qua JWT Guard ở mỗi request.
  async loginEmployee(dto: EmployeeLoginDto): Promise<EmployeeAuthResult> {
    // 1. Tìm nhân viên theo email
    const employee = await this.employeeRepo.findByEmail(dto.email);
    if (!employee || employee.deletedAt) {
      throw new UnauthorizedException('Email hoặc mật khẩu không hợp lệ');
    }
    // 2. Đảm bảo tài khoản đang ở trạng thái hoạt động (ACTIVE)
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }
    // 3. So khớp mật khẩu nhập vào với mật khẩu băm trong DB
    const isPasswordValid = await compare(dto.password, employee.hashedPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không hợp lệ');
    }
    return {
      user: { id: employee.id, email: employee.email, fullName: employee.fullName },
    };
  }

  // Đổi mật khẩu cho nhân viên.
  // Logic: Xác thực mật khẩu cũ -> Hash mật khẩu mới -> Cập nhật DB.
  async changePassword(employeeId: number, dto: ChangePasswordDto): Promise<void> {
    // 1. Lấy mật khẩu băm hiện tại của nhân viên
    const currentHash = await this.employeeRepo.findHashedPasswordById(employeeId);
    if (!currentHash) {
      throw new BadRequestException('Không tìm thấy nhân viên');
    }
    // 2. Xác thực mật khẩu cũ trước khi cho phép đổi mật khẩu mới
    const isCurrentPasswordValid = await compare(dto.currentPassword, currentHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }
    // 3. Hash mật khẩu mới với số vòng salt được giới hạn an toàn
    const normalizedSaltRounds = Math.min(Math.max(BCRYPT_SALT_ROUNDS, 4), 31);
    const newHashedPassword = await hash(dto.newPassword, normalizedSaltRounds);
    // 4. Cập nhật mật khẩu mới vào cơ sở dữ liệu
    const isUpdated = await this.employeeRepo.updatePassword(employeeId, newHashedPassword);
    if (!isUpdated) {
      throw new BadRequestException('Không thể cập nhật mật khẩu');
    }
  }
}
