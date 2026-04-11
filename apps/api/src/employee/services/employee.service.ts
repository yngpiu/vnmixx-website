import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { EmployeeRoleService } from '../../rbac/services/employee-role.service';
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
  constructor(
    private readonly employeeRepo: EmployeeRepository,
    private readonly employeeRoleService: EmployeeRoleService,
  ) {}

  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    isSoftDeleted?: boolean;
    onlyDeleted?: boolean;
    roleId?: number;
  }): Promise<PaginatedResult<EmployeeListItemView>> {
    return this.employeeRepo.findList(params);
  }

  async findById(id: number): Promise<EmployeeDetailView> {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');
    return employee;
  }

  async create(dto: CreateEmployeeDto): Promise<EmployeeDetailView> {
    if (await this.employeeRepo.emailExists(dto.email)) {
      throw new ConflictException('Email đã được sử dụng');
    }
    if (await this.employeeRepo.phoneExists(dto.phoneNumber)) {
      throw new ConflictException('Số điện thoại đã được sử dụng');
    }

    const hashedPassword = await hash(dto.password, BCRYPT_ROUNDS);

    if (dto.roleIds?.length) {
      await this.employeeRoleService.ensureRoleIdsExist(dto.roleIds);
    }

    const created = await this.employeeRepo.create({
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      hashedPassword,
    });

    if (dto.roleIds?.length) {
      await this.employeeRoleService.syncRoles(created.id, dto.roleIds);
      return this.findById(created.id);
    }

    return created;
  }

  async update(id: number, dto: UpdateEmployeeDto): Promise<EmployeeDetailView> {
    const hasIsActive = dto.isActive !== undefined;
    const hasRoleIds = dto.roleIds !== undefined;

    if (!hasIsActive && !hasRoleIds) {
      throw new BadRequestException('Cần cung cấp trạng thái hoặc danh sách vai trò');
    }

    if (hasIsActive) {
      const updated = await this.employeeRepo.update(id, { isActive: dto.isActive });
      if (!updated) throw new NotFoundException('Không tìm thấy nhân viên');
    } else {
      const existing = await this.employeeRepo.findById(id);
      if (!existing) throw new NotFoundException('Không tìm thấy nhân viên');
    }

    if (hasRoleIds) {
      await this.employeeRoleService.syncRoles(id, dto.roleIds!);
    }

    return this.findById(id);
  }

  async softDelete(id: number): Promise<void> {
    const deleted = await this.employeeRepo.softDelete(id);
    if (!deleted) throw new NotFoundException('Không tìm thấy nhân viên');
  }

  async restore(id: number): Promise<EmployeeDetailView> {
    const restored = await this.employeeRepo.restore(id);
    if (!restored) throw new NotFoundException('Không tìm thấy nhân viên or not deleted');
    return restored;
  }
}
