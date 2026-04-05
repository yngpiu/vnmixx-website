import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  CreateAttributeDto,
  CreateAttributeValueDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from '../dto';
import {
  AttributeRepository,
  AttributeValueAdminView,
  AttributeWithValuesView,
} from '../repositories/attribute.repository';

@Injectable()
export class AttributeService {
  constructor(private readonly repository: AttributeRepository) {}

  findAll(): Promise<AttributeWithValuesView[]> {
    return this.repository.findAll();
  }

  async create(dto: CreateAttributeDto): Promise<AttributeWithValuesView> {
    try {
      return await this.repository.create({ name: dto.name });
    } catch (err) {
      this.handleUniqueViolation(err, `Attribute name "${dto.name}" already exists`);
      throw err;
    }
  }

  async update(id: number, dto: UpdateAttributeDto): Promise<AttributeWithValuesView> {
    await this.findByIdOrFail(id);
    try {
      return await this.repository.update(id, { name: dto.name });
    } catch (err) {
      this.handleUniqueViolation(err, `Attribute name "${dto.name}" already exists`);
      throw err;
    }
  }

  async remove(id: number): Promise<void> {
    await this.findByIdOrFail(id);
    await this.repository.delete(id);
  }

  // ─── Attribute Values ───────────────────────────────────────────────────────

  async createValue(
    attributeId: number,
    dto: CreateAttributeValueDto,
  ): Promise<AttributeValueAdminView> {
    await this.findByIdOrFail(attributeId);
    try {
      return await this.repository.createValue({ attributeId, value: dto.value });
    } catch (err) {
      this.handleUniqueViolation(err, `Value "${dto.value}" already exists for this attribute`);
      throw err;
    }
  }

  async updateValue(
    attributeId: number,
    valueId: number,
    dto: UpdateAttributeValueDto,
  ): Promise<AttributeValueAdminView> {
    await this.findByIdOrFail(attributeId);
    const value = await this.repository.findValueById(valueId);
    if (!value) throw new NotFoundException(`Attribute value #${valueId} not found`);
    if (value.attributeId !== attributeId) {
      throw new BadRequestException(
        `Value #${valueId} does not belong to attribute #${attributeId}`,
      );
    }

    try {
      return await this.repository.updateValue(valueId, { value: dto.value });
    } catch (err) {
      this.handleUniqueViolation(err, `Value "${dto.value}" already exists for this attribute`);
      throw err;
    }
  }

  async removeValue(attributeId: number, valueId: number): Promise<void> {
    await this.findByIdOrFail(attributeId);
    const value = await this.repository.findValueById(valueId);
    if (!value) throw new NotFoundException(`Attribute value #${valueId} not found`);
    if (value.attributeId !== attributeId) {
      throw new BadRequestException(
        `Value #${valueId} does not belong to attribute #${attributeId}`,
      );
    }

    await this.repository.deleteValue(valueId);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async findByIdOrFail(id: number): Promise<AttributeWithValuesView> {
    const attr = await this.repository.findById(id);
    if (!attr) throw new NotFoundException(`Attribute #${id} not found`);
    return attr;
  }

  private handleUniqueViolation(err: unknown, message: string): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException(message);
    }
  }
}
