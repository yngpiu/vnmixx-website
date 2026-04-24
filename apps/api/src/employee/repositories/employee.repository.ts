import { Injectable } from '@nestjs/common';
import { EmployeeStatus, Prisma } from '../../../generated/prisma/client';
import { softDeletedWhere } from '../../common/prisma/soft-deleted-where';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface EmployeeListItemView {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  status: EmployeeStatus;
  createdAt: Date;
  deletedAt: Date | null;
  role: { id: number; name: string } | null;
}

export interface EmployeeDetailView extends EmployeeListItemView {
  avatarUrl: string | null;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const LIST_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  deletedAt: true,
  role: { select: { id: true, name: true } },
} as const;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  avatarUrl: true,
  updatedAt: true,
} as const;

@Injectable()
export class EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildListOrderBy(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Prisma.EmployeeOrderByWithRelationInput {
    const dir = sortOrder === 'asc' ? 'asc' : 'desc';
    switch (sortBy) {
      case 'fullName':
        return { fullName: dir };
      case 'email':
        return { email: dir };
      case 'phoneNumber':
        return { phoneNumber: dir };
      case 'status':
        return { status: dir };
      case 'createdAt':
        return { createdAt: dir };
      default:
        return { createdAt: 'desc' };
    }
  }

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
    const { page, limit, search, status, isSoftDeleted, roleId, sortBy, sortOrder } = params;

    const where: Prisma.EmployeeWhereInput = {
      ...softDeletedWhere(isSoftDeleted),
      ...(status !== undefined && { status }),
      ...(roleId !== undefined && { roleId }),
      ...(search && {
        OR: [
          { fullName: { contains: search } },
          { email: { contains: search } },
          { phoneNumber: { contains: search } },
        ],
      }),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.buildListOrderBy(sortBy, sortOrder),
        select: LIST_SELECT,
      }),
    ]);

    return {
      data: data as EmployeeListItemView[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: number): Promise<EmployeeDetailView | null> {
    return this.prisma.employee.findUnique({
      where: { id },
      select: DETAIL_SELECT,
    }) as unknown as Promise<EmployeeDetailView | null>;
  }

  async create(data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    hashedPassword: string;
    roleId: number;
  }): Promise<EmployeeDetailView> {
    const employee = await this.prisma.employee.create({
      data: {
        roleId: data.roleId,
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        hashedPassword: data.hashedPassword,
      },
      select: { id: true },
    });
    return this.findById(employee.id) as Promise<EmployeeDetailView>;
  }

  async update(id: number, data: Prisma.EmployeeUpdateInput): Promise<EmployeeDetailView | null> {
    const { count } = await this.prisma.employee.updateMany({
      where: { id, deletedAt: null },
      data,
    });
    if (count === 0) return null;
    return this.findById(id);
  }

  async softDelete(id: number): Promise<boolean> {
    const { count } = await this.prisma.employee.updateMany({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        status: EmployeeStatus.INACTIVE,
      },
    });
    return count > 0;
  }

  async restore(id: number): Promise<EmployeeDetailView | null> {
    const { count } = await this.prisma.employee.updateMany({
      where: { id, NOT: { deletedAt: null } },
      data: {
        deletedAt: null,
        status: EmployeeStatus.ACTIVE,
      },
    });
    if (count === 0) return null;
    return this.findById(id);
  }

  async emailExists(email: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: { email, ...(excludeId && { id: { not: excludeId } }) },
    });
    return count > 0;
  }

  async phoneExists(phone: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: { phoneNumber: phone, ...(excludeId && { id: { not: excludeId } }) },
    });
    return count > 0;
  }
}
