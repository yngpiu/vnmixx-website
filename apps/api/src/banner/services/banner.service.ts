import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { isPrismaErrorCode } from '../../common/utils/prisma.util';
import { RedisService } from '../../redis/services/redis.service';
import { BANNER_CACHE_KEYS, BANNER_CACHE_PATTERNS, BANNER_CACHE_TTL } from '../banner.cache';
import { CreateBannerDto, UpdateBannerDto } from '../dto';
import { BannerAdminView, BannerRepository, BannerView } from '../repositories/banner.repository';

@Injectable()
export class BannerService {
  constructor(
    private readonly repository: BannerRepository,
    private readonly redis: RedisService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findActivePublic(opts?: {
    placement?: 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP';
  }): Promise<BannerView[]> {
    const cacheKey = BANNER_CACHE_KEYS.buildPublicListKey(opts?.placement);
    return this.redis.getOrSet(cacheKey, BANNER_CACHE_TTL.BANNER, () =>
      this.repository.findAllActivePublic(opts),
    );
  }

  async findAll(opts?: {
    isActive?: boolean;
    placement?: 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP';
  }): Promise<BannerAdminView[]> {
    return this.repository.findAll(opts);
  }

  async findById(id: number): Promise<BannerAdminView> {
    const banner = await this.repository.findById(id);
    if (!banner) {
      throw new NotFoundException(`Không tìm thấy banner #${id}`);
    }
    return banner;
  }

  async create(
    dto: CreateBannerDto,
    auditContext: AuditRequestContext = {},
  ): Promise<BannerAdminView> {
    try {
      await this.validateCategoryForBinding(dto.categoryId);
      const result = await this.repository.create({
        placement: dto.placement,
        title: dto.title ?? null,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      });
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'banner.create',
        resourceType: 'banner',
        resourceId: String(result.id),
        status: AuditLogStatus.SUCCESS,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'banner.create',
        resourceType: 'banner',
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
    dto: UpdateBannerDto,
    auditContext: AuditRequestContext = {},
  ): Promise<BannerAdminView> {
    let beforeData: BannerAdminView | undefined;
    try {
      beforeData = await this.findById(id);
      if (dto.categoryId !== undefined) {
        await this.validateCategoryForBinding(dto.categoryId);
      }
      const result = await this.repository.update(id, {
        ...(dto.placement !== undefined && { placement: dto.placement }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      });
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'banner.update',
        resourceType: 'banner',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'banner.update',
        resourceType: 'banner',
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

  async deletePermanent(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.repository.findById(id);
    try {
      await this.findById(id);
      await this.repository.deleteById(id);
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'banner.delete',
        resourceType: 'banner',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'banner.delete',
        resourceType: 'banner',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async validateCategoryForBinding(categoryId: number): Promise<void> {
    const category = await this.repository.findCategoryStatusById(categoryId);
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục #${categoryId}`);
    }
    if (category.deletedAt) {
      throw new BadRequestException(`Danh mục #${categoryId} đã bị xóa`);
    }
    if (!category.isActive) {
      throw new BadRequestException(`Danh mục #${categoryId} không còn hoạt động`);
    }
  }

  private async invalidateCache(): Promise<void> {
    await this.redis.deleteByPattern(BANNER_CACHE_PATTERNS.ALL_BANNERS);
  }

  private handleUniqueViolation(error: unknown): void {
    if (isPrismaErrorCode(error, 'P2002')) {
      throw new BadRequestException('Dữ liệu banner bị trùng với một bản ghi đã tồn tại');
    }
  }
}
