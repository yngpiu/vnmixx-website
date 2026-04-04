import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Gender } from 'generated/prisma/client';
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
  ) {}

  async getCustomerProfile(customerId: number): Promise<CustomerProfileView> {
    const profile = await this.customerRepo.findById(customerId);
    if (!profile) throw new NotFoundException('Customer not found');
    return profile;
  }

  async updateCustomerProfile(
    customerId: number,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileView> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
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
    if (!updated) throw new NotFoundException('Customer not found');
    return updated;
  }

  async getEmployeeProfile(employeeId: number): Promise<EmployeeProfileView> {
    const profile = await this.employeeRepo.findById(employeeId);
    if (!profile) throw new NotFoundException('Employee not found');
    return profile;
  }

  async updateEmployeeProfile(
    employeeId: number,
    dto: UpdateEmployeeProfileDto,
  ): Promise<EmployeeProfileView> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const data: { fullName?: string; avatarUrl?: string } = {};

    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;

    const updated = await this.employeeRepo.update(employeeId, data);
    if (!updated) throw new NotFoundException('Employee not found');
    return updated;
  }
}
