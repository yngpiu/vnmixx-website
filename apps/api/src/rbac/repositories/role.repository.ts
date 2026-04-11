import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RoleListView {
  id: number;
  name: string;
  description: string | null;
  permissionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleDetailView {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: { id: number; name: string; description: string | null }[];
}

const DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  rolePermissions: {
    select: {
      permission: { select: { id: true, name: true, description: true } },
    },
  },
} as const;

function toDetailView(row: {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  rolePermissions: { permission: { id: number; name: string; description: string | null } }[];
}): RoleDetailView {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    permissions: row.rolePermissions.map((rp) => rp.permission),
  };
}

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RoleListView[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { rolePermissions: true } },
      },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissionCount: r._count.rolePermissions,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async findById(id: number): Promise<RoleDetailView | null> {
    const row = await this.prisma.role.findUnique({
      where: { id },
      select: DETAIL_SELECT,
    });
    return row ? toDetailView(row) : null;
  }

  async create(data: {
    name: string;
    description?: string;
    permissionIds?: number[];
  }): Promise<RoleDetailView> {
    const row = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        ...(data.permissionIds?.length && {
          rolePermissions: {
            createMany: {
              data: data.permissionIds.map((pid) => ({ permissionId: pid })),
            },
          },
        }),
      },
      select: DETAIL_SELECT,
    });
    return toDetailView(row);
  }

  async update(id: number, data: { name?: string; description?: string }): Promise<RoleDetailView> {
    const row = await this.prisma.role.update({
      where: { id },
      data,
      select: DETAIL_SELECT,
    });
    return toDetailView(row);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.role.delete({ where: { id } });
  }

  async syncPermissions(roleId: number, permissionIds: number[]): Promise<RoleDetailView> {
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...(permissionIds.length > 0
        ? [
            this.prisma.rolePermission.createMany({
              data: permissionIds.map((pid) => ({ roleId, permissionId: pid })),
            }),
          ]
        : []),
    ]);

    const row = await this.prisma.role.findUniqueOrThrow({
      where: { id: roleId },
      select: DETAIL_SELECT,
    });
    return toDetailView(row);
  }

  async findEmployeeIdsByRoleId(roleId: number): Promise<number[]> {
    const rows = await this.prisma.employeeRole.findMany({
      where: { roleId },
      select: { employeeId: true },
    });
    return rows.map((r) => r.employeeId);
  }
}
