import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface KnowledgeView {
  id: number;
  slug: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KNOWLEDGE_SELECT = {
  id: true,
  slug: true,
  title: true,
  content: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class KnowledgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(opts?: { isActive?: boolean }): Promise<KnowledgeView[]> {
    const where: Prisma.AiKnowledgeBaseWhereInput = {
      ...(opts?.isActive !== undefined && { isActive: opts.isActive }),
    };
    return this.prisma.aiKnowledgeBase.findMany({
      where,
      orderBy: [{ id: 'asc' }],
      select: KNOWLEDGE_SELECT,
    });
  }

  findById(id: number): Promise<KnowledgeView | null> {
    return this.prisma.aiKnowledgeBase.findFirst({
      where: { id },
      select: KNOWLEDGE_SELECT,
    });
  }

  findBySlug(slug: string): Promise<KnowledgeView | null> {
    return this.prisma.aiKnowledgeBase.findFirst({
      where: { slug },
      select: KNOWLEDGE_SELECT,
    });
  }

  create(data: {
    slug: string;
    title: string;
    content: string;
    isActive: boolean;
  }): Promise<KnowledgeView> {
    return this.prisma.aiKnowledgeBase.create({ data, select: KNOWLEDGE_SELECT });
  }

  update(
    id: number,
    data: {
      slug?: string;
      title?: string;
      content?: string;
      isActive?: boolean;
    },
  ): Promise<KnowledgeView> {
    return this.prisma.aiKnowledgeBase.update({
      where: { id },
      data,
      select: KNOWLEDGE_SELECT,
    });
  }

  deleteById(id: number): Promise<void> {
    return this.prisma.aiKnowledgeBase.delete({ where: { id } }).then(() => undefined);
  }
}
