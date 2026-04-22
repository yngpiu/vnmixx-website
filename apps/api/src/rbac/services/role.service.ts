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

// RoleService: Chịu trách nhiệm quản lý logic nghiệp vụ cho các vai trò (Roles) trong hệ thống.
// Đây là thành phần cốt lõi của hệ thống RBAC (Role-Based Access Control), cho phép định nghĩa các nhóm quyền hạn.
@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
    private readonly employeeAuthzCache: EmployeeAuthzCacheService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Lấy danh sách các vai trò có hỗ trợ tìm kiếm theo tên, sắp xếp và phân trang.
  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<RoleListView>> {
    return this.roleRepo.findList(params);
  }

  // Truy vấn thông tin chi tiết của một vai trò kèm theo danh sách các quyền hạn được gán.
  async findById(id: number): Promise<RoleDetailView> {
    const role = await this.roleRepo.findById(id);
    if (!role) throw new NotFoundException(`Không tìm thấy vai trò #${id}`);
    return role;
  }

  // Tạo vai trò mới.
  async create(
    dto: CreateRoleDto,
    auditContext: AuditRequestContext = {},
  ): Promise<RoleDetailView> {
    try {
      // 1. Kiểm tra tính hợp lệ của các ID quyền hạn (nếu có gán quyền ngay khi tạo)
      if (dto.permissionIds?.length) {
        await this.validatePermissionIds(dto.permissionIds);
      }

      // 2. Lưu vai trò mới vào cơ sở dữ liệu
      const createdRole = await this.roleRepo.create({
        name: dto.name,
        description: dto.description,
        permissionIds: dto.permissionIds,
      });

      // 3. Ghi lại nhật ký hệ thống (Audit Log) để theo dõi hoạt động quản trị
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
      // 4. Ghi nhận lỗi vào nhật ký nếu quá trình tạo thất bại
      await this.auditLogService.write({
        ...auditContext,
        action: 'role.create',
        resourceType: 'role',
        status: AuditLogStatus.FAILED,
        afterData: dto,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
      // 5. Xử lý trường hợp trùng tên vai trò để trả về thông báo lỗi thân thiện
      this.handleUniqueViolation(err, dto.name);
      throw err;
    }
  }

  // Cập nhật vai trò.
  async update(
    id: number,
    dto: UpdateRoleDto,
    auditContext: AuditRequestContext = {},
  ): Promise<RoleDetailView> {
    const beforeData = await this.findById(id);
    try {
      // 1. Ngăn chặn đổi tên vai trò quan trọng của hệ thống để tránh phá vỡ logic phân quyền cứng
      if (beforeData.name === 'Chủ cửa hàng' && dto.name && dto.name !== beforeData.name) {
        throw new BadRequestException('Không được phép đổi tên vai trò hệ thống này');
      }

      // 2. Kiểm tra tính hợp lệ của danh sách quyền mới (nếu có cập nhật)
      if (dto.permissionIds !== undefined) {
        const permissionIds = this.getPermissionIds(dto.permissionIds);
        await this.validatePermissionIds(permissionIds);
      }

      // 3. Cập nhật các thông tin cơ bản của vai trò
      const updatedRole = await this.roleRepo.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      });

      // 4. Nếu không cập nhật danh sách quyền thì kết thúc và ghi log thành công
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

      // 5. Cập nhật (đồng bộ) lại danh sách các quyền được gán cho vai trò này
      const permissionIds = this.getPermissionIds(dto.permissionIds);
      const roleWithPermissions = await this.roleRepo.syncPermissions(id, permissionIds);

      // 6. QUAN TRỌNG: Thu hồi cache phân quyền (Authorization Cache) của tất cả nhân viên đang sở hữu vai trò này
      //    đảm bảo các thay đổi về quyền hạn có hiệu lực ngay lập tức (Security Best Practice)
      const affectedEmployeeIds = await this.roleRepo.findEmployeeIdsByRoleId(id);
      await this.invalidateAuthzForEmployees(affectedEmployeeIds);

      // 7. Ghi nhận nhật ký cập nhật thành công kèm theo dữ liệu quyền hạn mới
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
      // 8. Ghi nhận lỗi cập nhật vào nhật ký hệ thống
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

  // Xóa vai trò.
  async delete(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const role = await this.findById(id);
    try {
      // 1. Bảo vệ vai trò tối cao "Chủ cửa hàng" không bao giờ bị xóa để tránh khóa hệ thống
      if (role.name === 'Chủ cửa hàng') {
        throw new BadRequestException('Không được phép xóa vai trò hệ thống tối cao');
      }

      // 2. Đảm bảo vai trò không còn nhân viên nào đang sử dụng trước khi thực hiện xóa
      const affectedEmployeeIds = await this.roleRepo.findEmployeeIdsByRoleId(id);
      if (affectedEmployeeIds.length > 0) {
        throw new BadRequestException(
          'Không thể xóa vai trò đang được gán cho nhân viên. Hãy đổi vai trò cho các nhân viên trước.',
        );
      }

      // 3. Thực hiện xóa vai trò khỏi cơ sở dữ liệu
      await this.roleRepo.delete(id);

      // 4. Xóa cache của các nhân viên liên quan (nếu có) để đảm bảo tính nhất quán dữ liệu
      await this.invalidateAuthzForEmployees(affectedEmployeeIds);

      // 5. Ghi nhận nhật ký xóa thành công
      await this.auditLogService.write({
        ...auditContext,
        action: 'role.delete',
        resourceType: 'role',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: role,
      });
    } catch (error) {
      // 6. Ghi nhận lỗi khi xóa thất bại
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

  // Kiểm tra xem toàn bộ danh sách ID quyền hạn có tồn tại thực tế trong DB hay không.
  private async validatePermissionIds(ids: number[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    const allExist = await this.permissionRepo.existAll(uniqueIds);
    if (!allExist) {
      throw new BadRequestException('Một hoặc nhiều ID quyền không tồn tại');
    }
  }

  // Chuẩn hóa và làm sạch danh sách ID quyền hạn đầu vào.
  private getPermissionIds(permissionIds: unknown): number[] {
    if (this.isIntegerArray(permissionIds)) {
      return [...new Set(permissionIds)];
    }
    throw new BadRequestException('Danh sách quyền không hợp lệ');
  }

  // Kiểm tra dữ liệu có phải là mảng số nguyên hay không.
  private isIntegerArray(value: unknown): value is number[] {
    return (
      Array.isArray(value) &&
      value.every((item: unknown) => typeof item === 'number' && Number.isInteger(item))
    );
  }

  // Thu hồi cache phân quyền (Authorization Cache) của danh sách nhân viên.
  // Buộc hệ thống phải tải lại quyền hạn từ DB trong lần truy cập tiếp theo.
  private async invalidateAuthzForEmployees(employeeIds: number[]): Promise<void> {
    await this.employeeAuthzCache.invalidateMany(employeeIds);
  }

  // Xử lý lỗi vi phạm ràng buộc duy nhất (Unique Violation) khi trùng tên vai trò.
  private handleUniqueViolation(err: unknown, name: string): void {
    if (isPrismaErrorCode(err, 'P2002')) {
      throw new ConflictException(`Tên vai trò "${name}" đã được sử dụng`);
    }
  }
}
