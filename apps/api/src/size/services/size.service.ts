import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '../../redis/cache-keys';
import { RedisService } from '../../redis/redis.service';
import { CreateSizeDto, UpdateSizeDto } from '../dto';
import { SizeAdminView, SizeRepository, SizeView } from '../repositories/size.repository';

@Injectable()
export class SizeService {
  constructor(
    private readonly repository: SizeRepository,
    private readonly redis: RedisService,
  ) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  findAllPublic(): Promise<SizeView[]> {
    return this.redis.getOrSet(CACHE_KEYS.SIZE_LIST, CACHE_TTL.SIZE, () =>
      this.repository.findAllPublic(),
    );
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  findAll(): Promise<SizeAdminView[]> {
    return this.repository.findAll();
  }

  async create(dto: CreateSizeDto): Promise<SizeAdminView> {
    try {
      const result = await this.repository.create({
        label: dto.label,
        sortOrder: dto.sortOrder ?? 0,
      });
      await this.invalidateCache();
      return result;
    } catch (err) {
      this.handleUniqueViolation(err);
      throw err;
    }
  }

  async update(id: number, dto: UpdateSizeDto): Promise<SizeAdminView> {
    await this.findByIdOrFail(id);
    try {
      const result = await this.repository.update(id, {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      });
      await this.invalidateCache();
      return result;
    } catch (err) {
      this.handleUniqueViolation(err);
      throw err;
    }
  }

  async remove(id: number): Promise<void> {
    await this.findByIdOrFail(id);

    if (await this.repository.hasVariants(id)) {
      throw new ConflictException('Cannot delete a size that is in use by product variants');
    }

    await this.repository.delete(id);
    await this.invalidateCache();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async invalidateCache(): Promise<void> {
    await this.redis.del(CACHE_KEYS.SIZE_LIST);
  }

  private async findByIdOrFail(id: number): Promise<SizeAdminView> {
    const size = await this.repository.findById(id);
    if (!size) throw new NotFoundException(`Size #${id} not found`);
    return size;
  }

  private handleUniqueViolation(err: unknown): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException('A size with this label already exists');
    }
  }
}
