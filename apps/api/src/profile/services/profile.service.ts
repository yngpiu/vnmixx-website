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

/**
 * Service quản lý hồ sơ người dùng (Profile).
 * Xử lý logic xem/cập nhật thông tin cá nhân và đổi mật khẩu cho cả Khách hàng và Nhân viên.
 */
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

  /**
   * Lấy thông tin hồ sơ của khách hàng theo ID.
   */
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

  /**
   * Cập nhật thông tin cá nhân của khách hàng (Họ tên, ngày sinh, giới tính, avatar).
   */
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

  /**
   * Đổi mật khẩu cho khách hàng hiện tại.
   * Logic: Ủy thác cho CustomerAuthService để xác thực mật khẩu cũ và hash mật khẩu mới.
   */
  async changeCustomerPassword(customerId: number, dto: ChangePasswordDto): Promise<void> {
    await this.customerAuthService.changePassword(customerId, dto);
  }

  /**
   * Lấy thông tin hồ sơ của nhân viên theo ID.
   */
  async getEmployeeProfile(employeeId: number): Promise<EmployeeProfileView> {
    const profile = await this.employeeRepo.findById(employeeId);
    if (!profile) throw new NotFoundException('Không tìm thấy nhân viên');
    return profile;
  }

  /**
   * Cập nhật thông tin cá nhân của nhân viên (Họ tên, số điện thoại, avatar).
   * Có ghi Audit Log để theo dõi lịch sử thay đổi thông tin nhân viên.
   */
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

  /**
   * Đổi mật khẩu cho nhân viên hiện tại.
   * Logic: Ủy thác cho EmployeeAuthService để xử lý xác thực và cập nhật.
   */
  async changeEmployeePassword(employeeId: number, dto: ChangePasswordDto): Promise<void> {
    await this.employeeAuthService.changePassword(employeeId, dto);
  }
}
