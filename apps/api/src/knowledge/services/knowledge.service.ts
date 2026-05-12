import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { isPrismaErrorCode } from '../../common/utils/prisma.util';
import type { CreateKnowledgeDto } from '../dto/create-knowledge.dto';
import type { UpdateKnowledgeDto } from '../dto/update-knowledge.dto';
import { KnowledgeRepository, type KnowledgeView } from '../repositories/knowledge.repository';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(opts?: { isActive?: boolean }): Promise<KnowledgeView[]> {
    return this.repository.findAll(opts);
  }

  async findById(id: number): Promise<KnowledgeView> {
    const item = await this.repository.findById(id);
    if (!item) throw new NotFoundException(`Không tìm thấy mục kiến thức #${id}`);
    return item;
  }

  async create(
    dto: CreateKnowledgeDto,
    auditContext: AuditRequestContext = {},
  ): Promise<KnowledgeView> {
    try {
      const result = await this.repository.create({
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        isActive: dto.isActive ?? true,
      });
      await this.auditLogService.write({
        ...auditContext,
        action: 'knowledge.create',
        resourceType: 'ai_knowledge_base',
        resourceId: String(result.id),
        status: AuditLogStatus.SUCCESS,
        afterData: { id: result.id, slug: result.slug },
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'knowledge.create',
        resourceType: 'ai_knowledge_base',
        status: AuditLogStatus.FAILED,
        afterData: { slug: dto.slug },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdateKnowledgeDto,
    auditContext: AuditRequestContext = {},
  ): Promise<KnowledgeView> {
    let beforeSlug: string | undefined;
    try {
      const before = await this.findById(id);
      beforeSlug = before.slug;
      const result = await this.repository.update(id, {
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });
      await this.auditLogService.write({
        ...auditContext,
        action: 'knowledge.update',
        resourceType: 'ai_knowledge_base',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: { id, slug: beforeSlug },
        afterData: { id: result.id, slug: result.slug },
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'knowledge.update',
        resourceType: 'ai_knowledge_base',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: beforeSlug !== undefined ? { id, slug: beforeSlug } : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async deletePermanent(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeItem = await this.repository.findById(id);
    try {
      await this.findById(id);
      await this.repository.deleteById(id);
      await this.auditLogService.write({
        ...auditContext,
        action: 'knowledge.delete',
        resourceType: 'ai_knowledge_base',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeItem ? { id: beforeItem.id, slug: beforeItem.slug } : undefined,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'knowledge.delete',
        resourceType: 'ai_knowledge_base',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: beforeItem ? { id: beforeItem.id, slug: beforeItem.slug } : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private handleUniqueViolation(error: unknown): void {
    if (isPrismaErrorCode(error, 'P2002')) {
      throw new BadRequestException('Slug đã tồn tại, vui lòng chọn slug khác.');
    }
  }
}
