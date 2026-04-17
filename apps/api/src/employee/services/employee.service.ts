import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { AuditLogStatus, EmployeeStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
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
    private readonly auditLogService: AuditLogService,
  ) {}

  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    status?: EmployeeStatus;
    isSoftDeleted?: boolean;
    roleId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<EmployeeListItemView>> {
    return this.employeeRepo.findList(params);
  }

  async findById(id: number): Promise<EmployeeDetailView> {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');
    return employee;
  }

  async create(
    dto: CreateEmployeeDto,
    auditContext: AuditRequestContext = {},
  ): Promise<EmployeeDetailView> {
    try {
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

      const createdEmployee = dto.roleIds?.length
        ? await this.employeeRoleService
            .syncRoles(created.id, dto.roleIds)
            .then(() => this.findById(created.id))
        : created;

      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.create',
        resourceType: 'employee',
        resourceId: String(createdEmployee.id),
        status: AuditLogStatus.SUCCESS,
        afterData: createdEmployee,
      });

      return createdEmployee;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.create',
        resourceType: 'employee',
        status: AuditLogStatus.FAILED,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdateEmployeeDto,
    auditContext: AuditRequestContext = {},
  ): Promise<EmployeeDetailView> {
    const beforeData = await this.employeeRepo.findById(id);
    try {
      const hasStatus = dto.status !== undefined;
      const hasRoleIds = dto.roleIds !== undefined;

      if (!hasStatus && !hasRoleIds) {
        throw new BadRequestException('Cần cung cấp trạng thái hoặc danh sách vai trò');
      }

      if (!beforeData) {
        throw new NotFoundException('Không tìm thấy nhân viên');
      }

      if (hasStatus) {
        const nextStatus = dto.status!;
        const updated = await this.employeeRepo.update(id, {
          status: nextStatus,
        });
        if (!updated) throw new NotFoundException('Không tìm thấy nhân viên');
        await this.employeeRoleService.invalidateEmployeeAuthzCache(id);
      }

      if (hasRoleIds) {
        await this.employeeRoleService.syncRoles(id, dto.roleIds!);
      }

      const afterData = await this.findById(id);
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.update',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData,
      });

      return afterData;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.update',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async softDelete(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.employeeRepo.findById(id);
    try {
      const deleted = await this.employeeRepo.softDelete(id);
      if (!deleted) throw new NotFoundException('Không tìm thấy nhân viên');
      await this.employeeRoleService.invalidateEmployeeAuthzCache(id);
      const afterData = await this.employeeRepo.findById(id);
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.delete',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.delete',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async restore(id: number, auditContext: AuditRequestContext = {}): Promise<EmployeeDetailView> {
    const beforeData = await this.employeeRepo.findById(id);
    try {
      const restored = await this.employeeRepo.restore(id);
      if (!restored) throw new NotFoundException('Không tìm thấy nhân viên or not deleted');
      await this.employeeRoleService.invalidateEmployeeAuthzCache(id);
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.restore',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: restored,
      });
      return restored;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.restore',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
