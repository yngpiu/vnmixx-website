import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus, type Gender } from 'generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
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

@Injectable()
export class ProfileService {
  constructor(
    private readonly customerRepo: CustomerProfileRepository,
    private readonly employeeRepo: EmployeeProfileRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getCustomerProfile(customerId: number): Promise<CustomerProfileView> {
    const profile = await this.customerRepo.findById(customerId);
    if (!profile) throw new NotFoundException('Không tìm thấy khách hàng');
    return profile;
  }

  async updateCustomerProfile(
    customerId: number,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileView> {
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
  }

  async getEmployeeProfile(employeeId: number): Promise<EmployeeProfileView> {
    const profile = await this.employeeRepo.findById(employeeId);
    if (!profile) throw new NotFoundException('Không tìm thấy nhân viên');
    return profile;
  }

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
}
