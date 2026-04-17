import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { EmployeeAuthzCacheService } from '../../auth/services/employee-authz-cache.service';
import type { CreateRoleDto, UpdateRoleDto } from '../dto';
import { PermissionRepository } from '../repositories/permission.repository';
import {
  type PaginatedResult,
  type RoleDetailView,
  type RoleListView,
  RoleRepository,
} from '../repositories/role.repository';

// Service xử lý logic nghiệp vụ cho vai trò và quyền hạn
@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
    private readonly employeeAuthzCache: EmployeeAuthzCacheService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Lấy danh sách vai trò có lọc và phân trang
  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<RoleListView>> {
    return this.roleRepo.findList(params);
  }

  // Tìm một vai trò theo ID hoặc báo lỗi nếu không tồn tại
  async findById(id: number): Promise<RoleDetailView> {
    const role = await this.roleRepo.findById(id);
    if (!role) throw new NotFoundException(`Không tìm thấy vai trò #${id}`);
    return role;
  }

  // Tạo vai trò mới, kiểm tra quyền hạn hợp lệ trước khi lưu
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

  // Cập nhật thông tin vai trò, bảo vệ vai trò hệ thống và đồng bộ lại quyền hạn
  async update(
    id: number,
    dto: UpdateRoleDto,
    auditContext: AuditRequestContext = {},
  ): Promise<RoleDetailView> {
    const beforeData = await this.findById(id);
    try {
      // Ngăn chặn đổi tên vai trò quan trọng của hệ thống
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

      // Nếu không cập nhật danh sách quyền thì trả về kết quả luôn
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

      // Cập nhật danh sách quyền và xóa cache authz cho nhân viên có vai trò này
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
      if (dto.name) this.handleUniqueViolation(err, dto.name);
      throw err;
    }
  }

  // Xóa vai trò và xóa cache authz của nhân viên từng gán vai trò này
  async delete(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const role = await this.findById(id);
    try {
      // Không cho phép xóa vai trò cấp cao nhất
      if (role.name === 'Chủ cửa hàng') {
        throw new BadRequestException('Không được phép xóa vai trò hệ thống tối cao');
      }

      const affectedEmployeeIds = await this.roleRepo.findEmployeeIdsByRoleId(id);
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
      throw error;
    }
  }

  // Kiểm tra xem tất cả ID quyền trong mảng có tồn tại thực tế không
  private async validatePermissionIds(ids: number[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    const allExist = await this.permissionRepo.existAll(uniqueIds);
    if (!allExist) {
      throw new BadRequestException('Một hoặc nhiều ID quyền không tồn tại');
    }
  }

  // Chuyển đổi đầu vào thành mảng ID quyền duy nhất
  private getPermissionIds(permissionIds: unknown): number[] {
    if (this.isIntegerArray(permissionIds)) {
      return [...new Set(permissionIds)];
    }
    throw new BadRequestException('Danh sách quyền không hợp lệ');
  }

  // Kiểm tra dữ liệu có phải mảng số nguyên không
  private isIntegerArray(value: unknown): value is number[] {
    return (
      Array.isArray(value) &&
      value.every((item: unknown) => typeof item === 'number' && Number.isInteger(item))
    );
  }

  // Thu hồi toàn bộ phiên đăng nhập của danh sách nhân viên
  private async invalidateAuthzForEmployees(employeeIds: number[]): Promise<void> {
    await this.employeeAuthzCache.invalidateMany(employeeIds);
  }

  // Xử lý lỗi trùng lặp tên vai trò từ cơ sở dữ liệu
  private handleUniqueViolation(err: unknown, name: string): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException(`Tên vai trò "${name}" đã được sử dụng`);
    }
  }
}
