import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SizeView {
  id: number;
  label: string;
  sortOrder: number;
}

export interface SizeAdminView extends SizeView {
  createdAt: Date;
  updatedAt: Date;
}

const SIZE_PUBLIC_SELECT = { id: true, label: true, sortOrder: true } as const;

const SIZE_ADMIN_SELECT = {
  ...SIZE_PUBLIC_SELECT,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class SizeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllPublic(): Promise<SizeView[]> {
    return this.prisma.size.findMany({
      orderBy: { sortOrder: 'asc' },
      select: SIZE_PUBLIC_SELECT,
    });
  }

  findAll(): Promise<SizeAdminView[]> {
    return this.prisma.size.findMany({
      orderBy: { sortOrder: 'asc' },
      select: SIZE_ADMIN_SELECT,
    });
  }

  findById(id: number): Promise<SizeAdminView | null> {
    return this.prisma.size.findUnique({
      where: { id },
      select: SIZE_ADMIN_SELECT,
    });
  }

  create(data: { label: string; sortOrder: number }): Promise<SizeAdminView> {
    return this.prisma.size.create({
      data,
      select: SIZE_ADMIN_SELECT,
    });
  }

  update(id: number, data: { label?: string; sortOrder?: number }): Promise<SizeAdminView> {
    return this.prisma.size.update({
      where: { id },
      data,
      select: SIZE_ADMIN_SELECT,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.size.delete({ where: { id } });
  }

  async hasVariants(id: number): Promise<boolean> {
    const count = await this.prisma.productVariant.count({ where: { sizeId: id } });
    return count > 0;
  }
}
