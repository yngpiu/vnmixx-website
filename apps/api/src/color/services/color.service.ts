import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CreateColorDto, UpdateColorDto } from '../dto';
import { ColorAdminView, ColorRepository, ColorView } from '../repositories/color.repository';

@Injectable()
export class ColorService {
  constructor(private readonly repository: ColorRepository) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  findAllPublic(): Promise<ColorView[]> {
    return this.repository.findAllPublic();
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  findAll(): Promise<ColorAdminView[]> {
    return this.repository.findAll();
  }

  async create(dto: CreateColorDto): Promise<ColorAdminView> {
    try {
      return await this.repository.create({ name: dto.name, hexCode: dto.hexCode });
    } catch (err) {
      this.handleUniqueViolation(err);
      throw err;
    }
  }

  async update(id: number, dto: UpdateColorDto): Promise<ColorAdminView> {
    await this.findByIdOrFail(id);
    try {
      return await this.repository.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.hexCode !== undefined && { hexCode: dto.hexCode }),
      });
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
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async findByIdOrFail(id: number): Promise<ColorAdminView> {
    const color = await this.repository.findById(id);
    if (!color) throw new NotFoundException(`Color #${id} not found`);
    return color;
  }

  private handleUniqueViolation(err: unknown): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') ?? 'field';
      throw new ConflictException(`A color with this ${target} already exists`);
    }
  }
}
