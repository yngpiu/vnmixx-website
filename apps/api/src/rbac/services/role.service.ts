import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { TokenService } from '../../auth/services/token.service';
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
    private readonly tokenService: TokenService,
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
  async create(dto: CreateRoleDto): Promise<RoleDetailView> {
    if (dto.permissionIds?.length) {
      await this.validatePermissionIds(dto.permissionIds);
    }

    try {
      return await this.roleRepo.create({
        name: dto.name,
        description: dto.description,
        permissionIds: dto.permissionIds,
      });
    } catch (err) {
      this.handleUniqueViolation(err, dto.name);
      throw err;
    }
  }

  // Cập nhật thông tin vai trò, bảo vệ vai trò hệ thống và đồng bộ lại quyền hạn
  async update(id: number, dto: UpdateRoleDto): Promise<RoleDetailView> {
    const existing = await this.findById(id);

    // Ngăn chặn đổi tên vai trò quan trọng của hệ thống
    if (existing.name === 'Chủ cửa hàng' && dto.name && dto.name !== existing.name) {
      throw new BadRequestException('Không được phép đổi tên vai trò hệ thống này');
    }

    if (dto.permissionIds !== undefined) {
      const permissionIds = this.getPermissionIds(dto.permissionIds);
      await this.validatePermissionIds(permissionIds);
    }

    try {
      const updatedRole = await this.roleRepo.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      });

      // Nếu không cập nhật danh sách quyền thì trả về kết quả luôn
      if (dto.permissionIds === undefined) {
        return updatedRole;
      }

      // Cập nhật danh sách quyền và thu hồi mã truy cập của các nhân viên bị ảnh hưởng
      const permissionIds = this.getPermissionIds(dto.permissionIds);
      const roleWithPermissions = await this.roleRepo.syncPermissions(id, permissionIds);
      const affectedEmployeeIds = await this.roleRepo.findEmployeeIdsByRoleId(id);
      await this.revokeTokensForEmployees(affectedEmployeeIds);
      return roleWithPermissions;
    } catch (err) {
      if (dto.name) this.handleUniqueViolation(err, dto.name);
      throw err;
    }
  }

  // Xóa vai trò và thu hồi phiên đăng nhập của nhân viên đang giữ vai trò này
  async delete(id: number): Promise<void> {
    const role = await this.findById(id);

    // Không cho phép xóa vai trò cấp cao nhất
    if (role.name === 'Chủ cửa hàng') {
      throw new BadRequestException('Không được phép xóa vai trò hệ thống tối cao');
    }

    const affectedEmployeeIds = await this.roleRepo.findEmployeeIdsByRoleId(id);
    await this.roleRepo.delete(id);
    await this.revokeTokensForEmployees(affectedEmployeeIds);
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
  private async revokeTokensForEmployees(employeeIds: number[]): Promise<void> {
    await Promise.all(
      employeeIds.map((employeeId) => this.tokenService.revokeAllSessions(employeeId, 'EMPLOYEE')),
    );
  }

  // Xử lý lỗi trùng lặp tên vai trò từ cơ sở dữ liệu
  private handleUniqueViolation(err: unknown, name: string): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException(`Tên vai trò "${name}" đã được sử dụng`);
    }
  }
}
