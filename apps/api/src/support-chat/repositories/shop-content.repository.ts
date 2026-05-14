import { Injectable } from '@nestjs/common';
import type { ShopContentKey } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface ShopContentView {
  title: string;
  content: string;
}

@Injectable()
export class ShopContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: ShopContentKey): Promise<ShopContentView | null> {
    return this.prisma.shopContent.findUnique({
      where: { key },
      select: { title: true, content: true },
    });
  }

  async findAll(): Promise<(ShopContentView & { key: ShopContentKey; updatedAt: Date })[]> {
    return this.prisma.shopContent.findMany({
      select: { key: true, title: true, content: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsert(key: ShopContentKey, title: string, content: string): Promise<void> {
    await this.prisma.shopContent.upsert({
      where: { key },
      create: { key, title, content },
      update: { title, content },
    });
  }
}
