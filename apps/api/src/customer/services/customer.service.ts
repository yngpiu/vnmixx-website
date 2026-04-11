import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UpdateCustomerDto } from '../dto/update-customer.dto';
import {
  CustomerRepository,
  type CustomerDetailView,
  type CustomerListItemView,
  type PaginatedResult,
} from '../repositories/customer.repository';

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepo: CustomerRepository) {}

  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    isSoftDeleted?: boolean;
    onlyDeleted?: boolean;
  }): Promise<PaginatedResult<CustomerListItemView>> {
    return this.customerRepo.findList(params);
  }

  async findById(id: number): Promise<CustomerDetailView> {
    const customer = await this.customerRepo.findById(id);
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<CustomerDetailView> {
    if (dto.isActive === undefined) {
      throw new BadRequestException('Cần cung cấp trạng thái hoạt động');
    }

    const updated = await this.customerRepo.update(id, { isActive: dto.isActive });
    if (!updated) throw new NotFoundException('Không tìm thấy khách hàng');
    return updated;
  }

  async softDelete(id: number): Promise<void> {
    const deleted = await this.customerRepo.softDelete(id);
    if (!deleted) throw new NotFoundException('Không tìm thấy khách hàng');
  }

  async restore(id: number): Promise<CustomerDetailView> {
    const restored = await this.customerRepo.restore(id);
    if (!restored)
      throw new NotFoundException('Không tìm thấy khách hàng hoặc bản ghi chưa bị xóa.');
    return restored;
  }
}
