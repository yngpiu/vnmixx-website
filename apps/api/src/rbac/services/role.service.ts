import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { EmployeeAuthzCacheService } from '../../auth/services/employee-authz-cache.service';
import { isPrismaErrorCode } from '../../common/utils/prisma.util';
import type { CreateRoleDto, UpdateRoleDto } from '../dto';
import { PermissionRepository } from '../repositories/permission.repository';
import {
  type PaginatedResult,
  type RoleDetailView,
  type RoleListView,
  RoleRepository,
} from '../repositories/role.repository';

@Injectable()
// Xử lý nghiệp vụ vai trò và đồng bộ quyền trong RBAC.
export class RoleService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
    private readonly employeeAuthzCache: EmployeeAuthzCacheService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Lấy danh sách vai trò theo điều kiện phân trang và tìm kiếm.
  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<RoleListView>> {
    return this.roleRepo.findList(params);
  }

  // Lấy chi tiết vai trò, không tồn tại thì trả 404.
  async findById(id: number): Promise<RoleDetailView> {
    const role = await this.roleRepo.findById(id);
    if (!role) throw new NotFoundException(`Không tìm thấy vai trò #${id}`);
    return role;
  }

  // Tạo vai trò mới, kiểm tra quyền hợp lệ và ghi audit log.
  async create(
    dto: CreateRoleDto,
    auditContext: AuditRequestContext = {},
  ): Promise<RoleDetailView> {
    try {
      if (dto.permissionIds?.length) {
        await this.validatePermissionIds(dto.permissionIds);
      }

      const createdRole = await this.roleRepo.create({
        name: dto.name,
        description: dto.description,
        permissionIds: dto.permissionIds,
      });

      await this.auditLogService.write({
        ...auditContext,
        action: 'role.create',
        resourceType: 'role',
        resourceId: String(createdRole.id),
        status: AuditLogStatus.SUCCESS,
        afterData: createdRole,
      });
      return createdRole;
    } catch (err) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'role.create',
        resourceType: 'role',
        status: AuditLogStatus.FAILED,
        afterData: dto,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
      this.handleUniqueViolation(err, dto.name);
      throw err;
    }
  }

  // Cập nhật vai trò, đồng bộ quyền và thu hồi cache phân quyền liên quan.
  async update(
    id: number,
    dto: UpdateRoleDto,
    auditContext: AuditRequestContext = {},
  ): Promise<RoleDetailView> {
    const beforeData = await this.findById(id);
    try {
      if (beforeData.name === 'Chủ cửa hàng' && dto.name && dto.name !== beforeData.name) {
        throw new BadRequestException('Không được phép đổi tên vai trò hệ thống này');
      }

      if (dto.permissionIds !== undefined) {
        const permissionIds = this.getPermissionIds(dto.permissionIds);
        await this.validatePermissionIds(permissionIds);
      }

      const updatedRole = await this.roleRepo.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      });

      if (dto.permissionIds === undefined) {
        await this.auditLogService.write({
          ...auditContext,
          action: 'role.update',
          resourceType: 'role',
          resourceId: String(id),
          status: AuditLogStatus.SUCCESS,
          beforeData,
          afterData: updatedRole,
        });
        return updatedRole;
      }

      const permissionIds = this.getPermissionIds(dto.permissionIds);
      const roleWithPermissions = await this.roleRepo.syncPermissions(id, permissionIds);

      const affectedEmployeeIds = await this.roleRepo.findEmployeeIdsByRoleId(id);
      await this.invalidateAuthzForEmployees(affectedEmployeeIds);

      await this.auditLogService.write({
        ...auditContext,
        action: 'role.update',
        resourceType: 'role',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: roleWithPermissions,
      });
      return roleWithPermissions;
    } catch (err) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'role.update',
        resourceType: 'role',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        afterData: dto,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
      this.handleNotFoundByPrisma(err, id);
      if (dto.name) this.handleUniqueViolation(err, dto.name);
      throw err;
    }
  }

  // Xóa vai trò khi không vi phạm ràng buộc nghiệp vụ.
  async delete(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const role = await this.findById(id);
    try {
      if (role.name === 'Chủ cửa hàng') {
        throw new BadRequestException('Không được phép xóa vai trò hệ thống tối cao');
      }

      const affectedEmployeeIds = await this.roleRepo.findEmployeeIdsByRoleId(id);
      if (affectedEmployeeIds.length > 0) {
        throw new BadRequestException(
          'Không thể xóa vai trò đang được gán cho nhân viên. Hãy đổi vai trò cho các nhân viên trước.',
        );
      }

      await this.roleRepo.delete(id);

      await this.invalidateAuthzForEmployees(affectedEmployeeIds);

      await this.auditLogService.write({
        ...auditContext,
        action: 'role.delete',
        resourceType: 'role',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: role,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'role.delete',
        resourceType: 'role',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: role,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleNotFoundByPrisma(error, id);
      throw error;
    }
  }

  // Kiểm tra toàn bộ permission id có tồn tại trong DB.
  private async validatePermissionIds(ids: number[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    const allExist = await this.permissionRepo.existAll(uniqueIds);
    if (!allExist) {
      throw new BadRequestException('Một hoặc nhiều ID quyền không tồn tại');
    }
  }

  // Chuẩn hóa permission id đầu vào và loại bỏ trùng lặp.
  private getPermissionIds(permissionIds: unknown): number[] {
    if (this.isIntegerArray(permissionIds)) {
      return [...new Set(permissionIds)];
    }
    throw new BadRequestException('Danh sách quyền không hợp lệ');
  }

  // Kiểm tra dữ liệu đầu vào có phải mảng số nguyên.
  private isIntegerArray(value: unknown): value is number[] {
    return (
      Array.isArray(value) &&
      value.every((item: unknown) => typeof item === 'number' && Number.isInteger(item))
    );
  }

  // Xóa cache phân quyền cho danh sách nhân viên bị ảnh hưởng.
  private async invalidateAuthzForEmployees(employeeIds: number[]): Promise<void> {
    await this.employeeAuthzCache.invalidateMany(employeeIds);
  }

  // Chuyển lỗi trùng dữ liệu Prisma thành lỗi nghiệp vụ 409.
  private handleUniqueViolation(err: unknown, name: string): void {
    if (isPrismaErrorCode(err, 'P2002')) {
      throw new ConflictException(`Tên vai trò "${name}" đã được sử dụng`);
    }
  }

  // Chuyển lỗi bản ghi không tồn tại của Prisma thành 404.
  private handleNotFoundByPrisma(err: unknown, id: number): void {
    if (isPrismaErrorCode(err, 'P2025')) {
      throw new NotFoundException(`Không tìm thấy vai trò #${id}`);
    }
  }
}
