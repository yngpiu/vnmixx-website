import { Injectable } from '@nestjs/common';
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
