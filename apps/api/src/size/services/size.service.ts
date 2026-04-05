import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CreateSizeDto, UpdateSizeDto } from '../dto';
import { SizeAdminView, SizeRepository, SizeView } from '../repositories/size.repository';

@Injectable()
export class SizeService {
  constructor(private readonly repository: SizeRepository) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  findAllPublic(): Promise<SizeView[]> {
    return this.repository.findAllPublic();
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  findAll(): Promise<SizeAdminView[]> {
    return this.repository.findAll();
  }

  async create(dto: CreateSizeDto): Promise<SizeAdminView> {
    try {
      return await this.repository.create({ label: dto.label, sortOrder: dto.sortOrder ?? 0 });
    } catch (err) {
      this.handleUniqueViolation(err);
      throw err;
    }
  }

  async update(id: number, dto: UpdateSizeDto): Promise<SizeAdminView> {
    await this.findByIdOrFail(id);
    try {
      return await this.repository.update(id, {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      });
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
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

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
