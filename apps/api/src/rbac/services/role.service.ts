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

@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
    private readonly tokenService: TokenService,
  ) {}

  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<RoleListView>> {
    return this.roleRepo.findList(params);
  }

  async findById(id: number): Promise<RoleDetailView> {
    const role = await this.roleRepo.findById(id);
    if (!role) throw new NotFoundException(`Không tìm thấy vai trò #${id}`);
    return role;
  }

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

  async update(id: number, dto: UpdateRoleDto): Promise<RoleDetailView> {
    await this.findById(id);
    if (dto.permissionIds !== undefined) {
      await this.validatePermissionIds(dto.permissionIds);
    }

    try {
      const updatedRole = await this.roleRepo.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      });
      if (dto.permissionIds === undefined) {
        return updatedRole;
      }
      const roleWithPermissions = await this.roleRepo.syncPermissions(id, dto.permissionIds);
      const affectedEmployeeIds = await this.roleRepo.findEmployeeIdsByRoleId(id);
      await this.revokeTokensForEmployees(affectedEmployeeIds);
      return roleWithPermissions;
    } catch (err) {
      if (dto.name) this.handleUniqueViolation(err, dto.name);
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);

    const affectedEmployeeIds = await this.roleRepo.findEmployeeIdsByRoleId(id);
    await this.roleRepo.delete(id);
    await this.revokeTokensForEmployees(affectedEmployeeIds);
  }

  private async validatePermissionIds(ids: number[]): Promise<void> {
    const allExist = await this.permissionRepo.existAll(ids);
    if (!allExist) {
      throw new BadRequestException('Một hoặc nhiều ID quyền không tồn tại');
    }
  }

  private async revokeTokensForEmployees(employeeIds: number[]): Promise<void> {
    await Promise.all(
      employeeIds.map((employeeId) => this.tokenService.revokeAllSessions(employeeId, 'EMPLOYEE')),
    );
  }

  private handleUniqueViolation(err: unknown, name: string): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException(`Tên vai trò "${name}" đã được sử dụng`);
    }
  }
}
