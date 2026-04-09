import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '../../redis/cache-keys';
import { RedisService } from '../../redis/redis.service';
import { CreateColorDto, UpdateColorDto } from '../dto';
import { ColorAdminView, ColorRepository, ColorView } from '../repositories/color.repository';

@Injectable()
export class ColorService {
  constructor(
    private readonly repository: ColorRepository,
    private readonly redis: RedisService,
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

  async create(dto: CreateColorDto): Promise<ColorAdminView> {
    try {
      const result = await this.repository.create({ name: dto.name, hexCode: dto.hexCode });
      await this.invalidateCache();
      return result;
    } catch (err) {
      this.handleUniqueViolation(err);
      throw err;
    }
  }

  async update(id: number, dto: UpdateColorDto): Promise<ColorAdminView> {
    await this.findByIdOrFail(id);
    try {
      const result = await this.repository.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.hexCode !== undefined && { hexCode: dto.hexCode }),
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
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async findByIdOrFail(id: number): Promise<ColorAdminView> {
    const color = await this.repository.findById(id);
    if (!color) throw new NotFoundException(`Color #${id} not found`);
    return color;
  }

  private async invalidateCache(): Promise<void> {
    await this.redis.del(CACHE_KEYS.COLOR_LIST);
  }

  private handleUniqueViolation(err: unknown): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') ?? 'field';
      throw new ConflictException(`A color with this ${target} already exists`);
    }
  }
}
