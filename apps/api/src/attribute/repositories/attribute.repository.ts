import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AttributeValueView {
  id: number;
  value: string;
}

export interface AttributeWithValuesView {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  values: AttributeValueView[];
}

export interface AttributeListItemView {
  id: number;
  name: string;
  valueCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedAttributeList {
  data: AttributeListItemView[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AttributeValueAdminView {
  id: number;
  attributeId: number;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const ATTRIBUTE_WITH_VALUES_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  values: {
    select: { id: true, value: true },
    orderBy: { value: 'asc' as const },
  },
} as const;

const ATTRIBUTE_VALUE_ADMIN_SELECT = {
  id: true,
  attributeId: true,
  value: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AttributeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildListOrderBy(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Prisma.AttributeOrderByWithRelationInput {
    const dir = sortOrder === 'asc' ? 'asc' : 'desc';
    switch (sortBy) {
      case 'name':
        return { name: dir };
      case 'updatedAt':
        return { updatedAt: dir };
      case 'valueCount':
        return { values: { _count: dir } };
      default:
        return { name: 'asc' };
    }
  }

  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedAttributeList> {
    const { page, limit, search, sortBy, sortOrder } = params;
    const where: Prisma.AttributeWhereInput = search
      ? {
          name: { contains: search },
        }
      : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.attribute.count({ where }),
      this.prisma.attribute.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.buildListOrderBy(sortBy, sortOrder),
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { values: true } },
        },
      }),
    ]);
    const data: AttributeListItemView[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      valueCount: row._count.values,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  findAll(): Promise<AttributeWithValuesView[]> {
    return this.prisma.attribute.findMany({
      orderBy: { name: 'asc' },
      select: ATTRIBUTE_WITH_VALUES_SELECT,
    });
  }

  findById(id: number): Promise<AttributeWithValuesView | null> {
    return this.prisma.attribute.findUnique({
      where: { id },
      select: ATTRIBUTE_WITH_VALUES_SELECT,
    });
  }

  create(data: { name: string }): Promise<AttributeWithValuesView> {
    return this.prisma.attribute.create({
      data,
      select: ATTRIBUTE_WITH_VALUES_SELECT,
    });
  }

  update(id: number, data: { name: string }): Promise<AttributeWithValuesView> {
    return this.prisma.attribute.update({
      where: { id },
      data,
      select: ATTRIBUTE_WITH_VALUES_SELECT,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.attribute.delete({ where: { id } });
  }

  // ─── Attribute Values ───────────────────────────────────────────────────────

  findValueById(valueId: number): Promise<AttributeValueAdminView | null> {
    return this.prisma.attributeValue.findUnique({
      where: { id: valueId },
      select: ATTRIBUTE_VALUE_ADMIN_SELECT,
    });
  }

  createValue(data: { attributeId: number; value: string }): Promise<AttributeValueAdminView> {
    return this.prisma.attributeValue.create({
      data,
      select: ATTRIBUTE_VALUE_ADMIN_SELECT,
    });
  }

  updateValue(valueId: number, data: { value: string }): Promise<AttributeValueAdminView> {
    return this.prisma.attributeValue.update({
      where: { id: valueId },
      data,
      select: ATTRIBUTE_VALUE_ADMIN_SELECT,
    });
  }

  async deleteValue(valueId: number): Promise<void> {
    await this.prisma.attributeValue.delete({ where: { id: valueId } });
  }
}
