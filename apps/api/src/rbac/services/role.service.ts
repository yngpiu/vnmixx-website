import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { RefreshTokenRepository } from '../../auth/repositories/refresh-token.repository';
import type { CreateRoleDto, UpdateRoleDto } from '../dto';
import { PermissionRepository } from '../repositories/permission.repository';
import {
  type RoleDetailView,
  type RoleListView,
  RoleRepository,
} from '../repositories/role.repository';

@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {}

  async findAll(): Promise<RoleListView[]> {
    return this.roleRepo.findAll();
  }

  async findById(id: number): Promise<RoleDetailView> {
    const role = await this.roleRepo.findById(id);
    if (!role) throw new NotFoundException(`Role #${id} not found`);
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

    try {
      return await this.roleRepo.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      });
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

  async syncPermissions(roleId: number, permissionIds: number[]): Promise<RoleDetailView> {
    await this.findById(roleId);
    await this.validatePermissionIds(permissionIds);

    const result = await this.roleRepo.syncPermissions(roleId, permissionIds);

    const affectedEmployeeIds = await this.roleRepo.findEmployeeIdsByRoleId(roleId);
    await this.revokeTokensForEmployees(affectedEmployeeIds);

    return result;
  }

  private async validatePermissionIds(ids: number[]): Promise<void> {
    const allExist = await this.permissionRepo.existAll(ids);
    if (!allExist) {
      throw new BadRequestException('One or more permission IDs do not exist');
    }
  }

  private async revokeTokensForEmployees(employeeIds: number[]): Promise<void> {
    await Promise.all(
      employeeIds.map((eid) => this.refreshTokenRepo.revokeAllByUser(eid, 'EMPLOYEE')),
    );
  }

  private handleUniqueViolation(err: unknown, name: string): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException(`Role name "${name}" is already taken`);
    }
  }
}
