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
  PaginatedAttributeList,
} from '../repositories/attribute.repository';

@Injectable()
export class AttributeService {
  constructor(private readonly repository: AttributeRepository) {}

  findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedAttributeList> {
    return this.repository.findList(params);
  }

  findAll(): Promise<AttributeWithValuesView[]> {
    return this.repository.findAll();
  }

  async findById(id: number): Promise<AttributeWithValuesView> {
    return this.findByIdOrFail(id);
  }

  async create(dto: CreateAttributeDto): Promise<AttributeWithValuesView> {
    try {
      return await this.repository.create({ name: dto.name });
    } catch (err) {
      this.handleUniqueViolation(err, `Tên thuộc tính "${dto.name}" đã tồn tại`);
      throw err;
    }
  }

  async update(id: number, dto: UpdateAttributeDto): Promise<AttributeWithValuesView> {
    await this.findByIdOrFail(id);
    try {
      return await this.repository.update(id, { name: dto.name });
    } catch (err) {
      this.handleUniqueViolation(err, `Tên thuộc tính "${dto.name}" đã tồn tại`);
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
      this.handleUniqueViolation(err, `Giá trị "${dto.value}" đã tồn tại cho thuộc tính này`);
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
    if (!value) throw new NotFoundException(`Không tìm thấy giá trị thuộc tính #${valueId}`);
    if (value.attributeId !== attributeId) {
      throw new BadRequestException(
        `Value #${valueId} does not belong to attribute #${attributeId}`,
      );
    }

    try {
      return await this.repository.updateValue(valueId, { value: dto.value });
    } catch (err) {
      this.handleUniqueViolation(err, `Giá trị "${dto.value}" đã tồn tại cho thuộc tính này`);
      throw err;
    }
  }

  async removeValue(attributeId: number, valueId: number): Promise<void> {
    await this.findByIdOrFail(attributeId);
    const value = await this.repository.findValueById(valueId);
    if (!value) throw new NotFoundException(`Không tìm thấy giá trị thuộc tính #${valueId}`);
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
    if (!attr) throw new NotFoundException(`Không tìm thấy thuộc tính #${id}`);
    return attr;
  }

  private handleUniqueViolation(err: unknown, message: string): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException(message);
    }
  }
}
