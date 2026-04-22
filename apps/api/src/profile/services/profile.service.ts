import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogStatus, type Gender } from 'generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type { ChangePasswordDto } from '../../auth/dto/change-password.dto';
import { CustomerAuthService } from '../../auth/services/customer-auth.service';
import { EmployeeAuthService } from '../../auth/services/employee-auth.service';
import type { UpdateCustomerProfileDto } from '../dto/update-customer-profile.dto';
import type { UpdateEmployeeProfileDto } from '../dto/update-employee-profile.dto';
import {
  CustomerProfileRepository,
  type CustomerProfileView,
} from '../repositories/customer.repository';
import {
  EmployeeProfileRepository,
  type EmployeeProfileView,
} from '../repositories/employee.repository';

// Quản lý hồ sơ người dùng (Profile) cho cả Khách hàng và Nhân viên.
// Xử lý các nghiệp vụ cập nhật thông tin cá nhân và bảo mật tài khoản.
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly customerRepo: CustomerProfileRepository,
    private readonly employeeRepo: EmployeeProfileRepository,
    private readonly auditLogService: AuditLogService,
    private readonly customerAuthService: CustomerAuthService,
    private readonly employeeAuthService: EmployeeAuthService,
  ) {}

  // Truy xuất hồ sơ khách hàng phục vụ hiển thị thông tin cá nhân.
  async getCustomerProfile(customerId: number): Promise<CustomerProfileView> {
    try {
      const profile = await this.customerRepo.findById(customerId);
      if (!profile) throw new NotFoundException('Không tìm thấy khách hàng');
      return profile;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Không thể lấy hồ sơ khách hàng #${customerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Không thể lấy thông tin hồ sơ khách hàng.');
    }
  }

  // Cập nhật các thông tin cơ bản của khách hàng (Họ tên, ngày sinh, giới tính, avatar).
  async updateCustomerProfile(
    customerId: number,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileView> {
    try {
      if (Object.keys(dto).length === 0) {
        throw new BadRequestException('Cần cung cấp ít nhất một trường dữ liệu');
      }

      const data: {
        fullName?: string;
        dob?: Date | null;
        gender?: Gender | null;
        avatarUrl?: string;
      } = {};

      if (dto.fullName !== undefined) data.fullName = dto.fullName;
      if (dto.dob !== undefined) data.dob = new Date(dto.dob);
      if (dto.gender !== undefined) data.gender = dto.gender as Gender;
      if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;

      const updated = await this.customerRepo.update(customerId, data);
      if (!updated) throw new NotFoundException('Không tìm thấy khách hàng');
      return updated;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Không thể cập nhật hồ sơ khách hàng #${customerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Không thể cập nhật hồ sơ khách hàng.');
    }
  }

  // Ủy thác việc đổi mật khẩu khách hàng cho chuyên biệt Auth Service.
  async changeCustomerPassword(customerId: number, dto: ChangePasswordDto): Promise<void> {
    await this.customerAuthService.changePassword(customerId, dto);
  }

  // Truy xuất hồ sơ nhân viên để quản lý thông tin nhân sự.
  async getEmployeeProfile(employeeId: number): Promise<EmployeeProfileView> {
    const profile = await this.employeeRepo.findById(employeeId);
    if (!profile) throw new NotFoundException('Không tìm thấy nhân viên');
    return profile;
  }

  // Cập nhật thông tin nhân viên kèm theo ghi nhật ký hệ thống (Audit Log).
  async updateEmployeeProfile(
    employeeId: number,
    dto: UpdateEmployeeProfileDto,
    auditContext: AuditRequestContext = {},
  ): Promise<EmployeeProfileView> {
    const beforeData = await this.employeeRepo.findById(employeeId);
    try {
      if (Object.keys(dto).length === 0) {
        throw new BadRequestException('Cần cung cấp ít nhất một trường dữ liệu');
      }

      const data: { fullName?: string; avatarUrl?: string; phoneNumber?: string } = {};

      if (dto.fullName !== undefined) data.fullName = dto.fullName;
      if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
      if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;

      const updated = await this.employeeRepo.update(employeeId, data);
      if (!updated) throw new NotFoundException('Không tìm thấy nhân viên');

      await this.auditLogService.write({
        ...auditContext,
        action: 'profile.employee.update',
        resourceType: 'employee',
        resourceId: String(employeeId),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
        afterData: updated,
      });
      return updated;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'profile.employee.update',
        resourceType: 'employee',
        resourceId: String(employeeId),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Ủy thác việc đổi mật khẩu nhân viên cho Employee Auth Service.
  async changeEmployeePassword(employeeId: number, dto: ChangePasswordDto): Promise<void> {
    await this.employeeAuthService.changePassword(employeeId, dto);
  }
}
