import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PermissionView {
  id: number;
  name: string;
  description: string | null;
}

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PermissionView[]> {
    return this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });
  }

  async existAll(ids: number[]): Promise<boolean> {
    const count = await this.prisma.permission.count({
      where: { id: { in: ids } },
    });
    return count === ids.length;
  }
}
