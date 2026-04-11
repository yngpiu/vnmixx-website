import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CustomerListItemView {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  gender: string | null;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface CustomerDetailView extends CustomerListItemView {
  dob: Date | null;
  emailVerifiedAt: Date | null;
  updatedAt: Date;
  _count: { addresses: number };
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
  gender: true,
  isActive: true,
  createdAt: true,
  deletedAt: true,
} as const;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  dob: true,
  emailVerifiedAt: true,
  updatedAt: true,
  _count: { select: { addresses: true } },
} as const;

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    isSoftDeleted?: boolean;
    onlyDeleted?: boolean;
  }): Promise<PaginatedResult<CustomerListItemView>> {
    const { page, limit, search, isActive, isSoftDeleted, onlyDeleted } = params;

    let deletedAtFilter: Prisma.CustomerWhereInput;
    if (onlyDeleted === true) {
      deletedAtFilter = { NOT: { deletedAt: null } };
    } else if (isSoftDeleted === true) {
      deletedAtFilter = {};
    } else {
      deletedAtFilter = { deletedAt: null };
    }

    const where: Prisma.CustomerWhereInput = {
      ...deletedAtFilter,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { fullName: { contains: search } },
          { email: { contains: search } },
          { phoneNumber: { contains: search } },
        ],
      }),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: LIST_SELECT,
      }),
    ]);

    return {
      data: data as unknown as CustomerListItemView[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: number): Promise<CustomerDetailView | null> {
    return this.prisma.customer.findUnique({
      where: { id },
      select: DETAIL_SELECT,
    }) as unknown as Promise<CustomerDetailView | null>;
  }

  async update(id: number, data: Prisma.CustomerUpdateInput): Promise<CustomerDetailView | null> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, deletedAt: null },
      data,
    });
    if (count === 0) return null;
    return this.findById(id);
  }

  async softDelete(id: number): Promise<boolean> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    return count > 0;
  }

  async restore(id: number): Promise<CustomerDetailView | null> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, NOT: { deletedAt: null } },
      data: { deletedAt: null, isActive: true },
    });
    if (count === 0) return null;
    return this.findById(id);
  }
}
