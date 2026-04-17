import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { CACHE_KEYS, CACHE_TTL } from '../../redis/cache-keys';
import { RedisService } from '../../redis/redis.service';
import { CreateColorDto, UpdateColorDto } from '../dto';
import {
  ColorAdminView,
  ColorRepository,
  ColorView,
  PaginatedColorList,
} from '../repositories/color.repository';

@Injectable()
export class ColorService {
  constructor(
    private readonly repository: ColorRepository,
    private readonly redis: RedisService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  findAllPublic(): Promise<ColorView[]> {
    return this.redis.getOrSet(CACHE_KEYS.COLOR_LIST, CACHE_TTL.COLOR, () =>
      this.repository.findAllPublic(),
    );
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  findAll(): Promise<ColorAdminView[]> {
    return this.repository.findAll();
  }

  findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedColorList> {
    return this.repository.findList(params);
  }

  async create(
    dto: CreateColorDto,
    auditContext: AuditRequestContext = {},
  ): Promise<ColorAdminView> {
    try {
      const result = await this.repository.create({ name: dto.name, hexCode: dto.hexCode });
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.create',
        resourceType: 'color',
        resourceId: String(result.id),
        status: AuditLogStatus.SUCCESS,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.create',
        resourceType: 'color',
        status: AuditLogStatus.FAILED,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdateColorDto,
    auditContext: AuditRequestContext = {},
  ): Promise<ColorAdminView> {
    let beforeData: ColorAdminView | undefined;
    try {
      beforeData = await this.findByIdOrFail(id);
      const result = await this.repository.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.hexCode !== undefined && { hexCode: dto.hexCode }),
      });
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.update',
        resourceType: 'color',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.update',
        resourceType: 'color',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async remove(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.repository.findById(id);
    try {
      await this.findByIdOrFail(id);

      const [hasVariants, hasImages] = await Promise.all([
        this.repository.hasVariants(id),
        this.repository.hasImages(id),
      ]);

      if (hasVariants || hasImages) {
        throw new ConflictException(
          'Cannot delete a color that is in use by product variants or images',
        );
      }

      await this.repository.delete(id);
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.delete',
        resourceType: 'color',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.delete',
        resourceType: 'color',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async findByIdOrFail(id: number): Promise<ColorAdminView> {
    const color = await this.repository.findById(id);
    if (!color) throw new NotFoundException(`Không tìm thấy màu sắc #${id}`);
    return color;
  }

  private async invalidateCache(): Promise<void> {
    await this.redis.del(CACHE_KEYS.COLOR_LIST);
  }

  private handleUniqueViolation(err: unknown): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') ?? 'field';
      throw new ConflictException(`Màu sắc với ${target} này đã tồn tại`);
    }
  }
}
