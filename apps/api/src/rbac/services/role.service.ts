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
import { isPrismaErrorCode } from '../../common/errors/prisma-error.util';
import type { CreateRoleDto, UpdateRoleDto } from '../dto';
import { PermissionRepository } from '../repositories/permission.repository';
import {
  type PaginatedResult,
  type RoleDetailView,
  type RoleListView,
  RoleRepository,
} from '../repositories/role.repository';

/**
 * RoleService: Chịu trách nhiệm quản lý logic nghiệp vụ cho các vai trò (Roles) trong hệ thống.
 * Đây là thành phần cốt lõi của hệ thống RBAC (Role-Based Access Control), cho phép định nghĩa các nhóm quyền hạn.
 */
@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
    private readonly employeeAuthzCache: EmployeeAuthzCacheService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Lấy danh sách các vai trò có hỗ trợ tìm kiếm theo tên, sắp xếp và phân trang.
   */
  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<RoleListView>> {
    return this.roleRepo.findList(params);
  }

  /**
   * Truy vấn thông tin chi tiết của một vai trò kèm theo danh sách các quyền hạn được gán.
   */
  async findById(id: number): Promise<RoleDetailView> {
    const role = await this.roleRepo.findById(id);
    if (!role) throw new NotFoundException(`Không tìm thấy vai trò #${id}`);
    return role;
  }

  /**
   * Tạo vai trò mới.
   * Logic:
   * 1. Kiểm tra tính hợp lệ của các ID quyền hạn (nếu có gán quyền ngay khi tạo).
   * 2. Lưu vào DB và ghi Audit Log.
   * 3. Xử lý lỗi trùng tên vai trò.
   */
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

  /**
   * Cập nhật vai trò.
   * Logic:
   * 1. Bảo vệ các vai trò hệ thống quan trọng (ví dụ: Chủ cửa hàng) không được đổi tên.
   * 2. Cập nhật thông tin cơ bản (tên, mô tả).
   * 3. Nếu có cập nhật danh sách quyền hạn (permissionIds), thực hiện đồng bộ (sync) trong DB.
   * 4. QUAN TRỌNG: Thu hồi cache phân quyền (Authorization Cache) của tất cả nhân viên đang sở hữu vai trò này
   *    để các thay đổi về quyền hạn có hiệu lực ngay lập tức.
   */
  async update(
    id: number,
    dto: UpdateRoleDto,
    auditContext: AuditRequestContext = {},
  ): Promise<RoleDetailView> {
    const beforeData = await this.findById(id);
    try {
      // Ngăn chặn đổi tên vai trò quan trọng của hệ thống để tránh phá vỡ logic phân quyền cứng
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

  /**
   * Xóa vai trò.
   * Logic:
   * 1. Không cho phép xóa vai trò "Chủ cửa hàng".
   * 2. Không cho phép xóa vai trò nếu vẫn còn nhân viên đang gán vai trò này.
   * 3. Xóa vai trò và thu hồi cache phân quyền của các nhân viên liên quan.
   */
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
      throw error;
    }
  }

  /**
   * Kiểm tra xem toàn bộ danh sách ID quyền hạn có tồn tại thực tế trong DB hay không.
   */
  private async validatePermissionIds(ids: number[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    const allExist = await this.permissionRepo.existAll(uniqueIds);
    if (!allExist) {
      throw new BadRequestException('Một hoặc nhiều ID quyền không tồn tại');
    }
  }

  /**
   * Chuẩn hóa và làm sạch danh sách ID quyền hạn đầu vào.
   */
  private getPermissionIds(permissionIds: unknown): number[] {
    if (this.isIntegerArray(permissionIds)) {
      return [...new Set(permissionIds)];
    }
    throw new BadRequestException('Danh sách quyền không hợp lệ');
  }

  /**
   * Kiểm tra dữ liệu có phải là mảng số nguyên hay không.
   */
  private isIntegerArray(value: unknown): value is number[] {
    return (
      Array.isArray(value) &&
      value.every((item: unknown) => typeof item === 'number' && Number.isInteger(item))
    );
  }

  /**
   * Thu hồi cache phân quyền (Authorization Cache) của danh sách nhân viên.
   * Buộc hệ thống phải tải lại quyền hạn từ DB trong lần truy cập tiếp theo.
   */
  private async invalidateAuthzForEmployees(employeeIds: number[]): Promise<void> {
    await this.employeeAuthzCache.invalidateMany(employeeIds);
  }

  /**
   * Xử lý lỗi vi phạm ràng buộc duy nhất (Unique Violation) khi trùng tên vai trò.
   */
  private handleUniqueViolation(err: unknown, name: string): void {
    if (isPrismaErrorCode(err, 'P2002')) {
      throw new ConflictException(`Tên vai trò "${name}" đã được sử dụng`);
    }
  }
}
