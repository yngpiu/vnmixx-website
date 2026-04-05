import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Gender } from '../../../generated/prisma/client';
import type { UpdateCustomerDto } from '../dto/update-customer.dto';
import {
  CustomerRepository,
  type CustomerDetailView,
  type CustomerListItemView,
  type PaginatedResult,
} from '../repositories/customer.repository';

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepo: CustomerRepository) {}

  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    includeDeleted?: boolean;
  }): Promise<PaginatedResult<CustomerListItemView>> {
    return this.customerRepo.findList(params);
  }

  async findById(id: number): Promise<CustomerDetailView> {
    const customer = await this.customerRepo.findById(id);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<CustomerDetailView> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const data: {
      fullName?: string;
      phoneNumber?: string;
      dob?: Date | null;
      gender?: Gender | null;
      isActive?: boolean;
    } = {};

    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.dob !== undefined) data.dob = new Date(dto.dob);
    if (dto.gender !== undefined) data.gender = dto.gender as Gender;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.customerRepo.update(id, data);
    if (!updated) throw new NotFoundException('Customer not found');
    return updated;
  }

  async softDelete(id: number): Promise<void> {
    const deleted = await this.customerRepo.softDelete(id);
    if (!deleted) throw new NotFoundException('Customer not found');
  }

  async restore(id: number): Promise<CustomerDetailView> {
    const restored = await this.customerRepo.restore(id);
    if (!restored) throw new NotFoundException('Customer not found or not deleted');
    return restored;
  }
}
