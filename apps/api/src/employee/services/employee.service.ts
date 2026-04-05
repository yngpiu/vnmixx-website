import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import type { CreateEmployeeDto } from '../dto/create-employee.dto';
import type { UpdateEmployeeDto } from '../dto/update-employee.dto';
import {
  EmployeeRepository,
  type EmployeeDetailView,
  type EmployeeListItemView,
  type PaginatedResult,
} from '../repositories/employee.repository';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class EmployeeService {
  constructor(private readonly employeeRepo: EmployeeRepository) {}

  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    includeDeleted?: boolean;
  }): Promise<PaginatedResult<EmployeeListItemView>> {
    return this.employeeRepo.findList(params);
  }

  async findById(id: number): Promise<EmployeeDetailView> {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(dto: CreateEmployeeDto): Promise<EmployeeDetailView> {
    if (await this.employeeRepo.emailExists(dto.email)) {
      throw new ConflictException('Email already in use');
    }
    if (await this.employeeRepo.phoneExists(dto.phoneNumber)) {
      throw new ConflictException('Phone number already in use');
    }

    const hashedPassword = await hash(dto.password, BCRYPT_ROUNDS);

    return this.employeeRepo.create({
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      hashedPassword,
    });
  }

  async update(id: number, dto: UpdateEmployeeDto): Promise<EmployeeDetailView> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const data: {
      fullName?: string;
      phoneNumber?: string;
      avatarUrl?: string;
      isActive?: boolean;
    } = {};

    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.employeeRepo.update(id, data);
    if (!updated) throw new NotFoundException('Employee not found');
    return updated;
  }

  async softDelete(id: number): Promise<void> {
    const deleted = await this.employeeRepo.softDelete(id);
    if (!deleted) throw new NotFoundException('Employee not found');
  }

  async restore(id: number): Promise<EmployeeDetailView> {
    const restored = await this.employeeRepo.restore(id);
    if (!restored) throw new NotFoundException('Employee not found or not deleted');
    return restored;
  }
}
