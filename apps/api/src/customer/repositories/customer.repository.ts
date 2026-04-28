import { Injectable } from '@nestjs/common';
import { CustomerStatus, Prisma } from '../../../generated/prisma/client';
import { softDeletedWhere } from '../../common/utils/prisma.util';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface CustomerListItemView {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  gender: string | null;
  status: CustomerStatus;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface CustomerDetailView extends CustomerListItemView {
  dob: Date | null;
  emailVerifiedAt: Date | null;
  updatedAt: Date;
  _count: { addresses: number };
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const LIST_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  avatarUrl: true,
  gender: true,
  status: true,
  createdAt: true,
  deletedAt: true,
} as const;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  dob: true,
  emailVerifiedAt: true,
  updatedAt: true,
  _count: { select: { addresses: true } },
} as const;

// Repository xử lý các thao tác trực tiếp với cơ sở dữ liệu cho thực thể Khách hàng.
// Bao gồm các truy vấn phức tạp như phân trang, tìm kiếm toàn văn và xử lý logic xóa mềm.
@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Xây dựng đối tượng sắp xếp dựa trên tham số đầu vào.
  private buildListOrderBy(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Prisma.CustomerOrderByWithRelationInput {
    const dir = sortOrder === 'asc' ? 'asc' : 'desc';
    switch (sortBy) {
      case 'fullName':
        return { fullName: dir };
      case 'email':
        return { email: dir };
      case 'phoneNumber':
        return { phoneNumber: dir };
      case 'status':
        return { status: dir };
      case 'createdAt':
        return { createdAt: dir };
      default:
        return { createdAt: 'desc' };
    }
  }

  // Lấy danh sách khách hàng có lọc và phân trang.
  // Sử dụng transaction để đồng bộ việc đếm tổng số bản ghi và lấy dữ liệu trang hiện tại.
  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    status?: CustomerStatus;
    isSoftDeleted?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<CustomerListItemView>> {
    const { page, limit, search, status, isSoftDeleted, sortBy, sortOrder } = params;

    const where: Prisma.CustomerWhereInput = {
      ...softDeletedWhere(isSoftDeleted),
      ...(status !== undefined && { status }),
      ...(search && {
        OR: [
          { fullName: { contains: search } },
          { email: { contains: search } },
          { phoneNumber: { contains: search } },
        ],
      }),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.buildListOrderBy(sortBy, sortOrder),
        select: LIST_SELECT,
      }),
    ]);

    return {
      data: data as unknown as CustomerListItemView[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // Tìm khách hàng theo ID kèm theo các thông tin chi tiết.
  async findById(id: number): Promise<CustomerDetailView | null> {
    return this.prisma.customer.findUnique({
      where: { id },
      select: DETAIL_SELECT,
    }) as unknown as Promise<CustomerDetailView | null>;
  }

  // Cập nhật dữ liệu khách hàng. Chỉ cập nhật nếu khách hàng chưa bị xóa vĩnh viễn.
  async update(id: number, data: Prisma.CustomerUpdateInput): Promise<CustomerDetailView | null> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, deletedAt: null },
      data,
    });
    if (count === 0) return null;
    return this.findById(id);
  }

  // Thực hiện xóa mềm khách hàng.
  // Đồng thời chuyển trạng thái tài khoản sang INACTIVE.
  async softDelete(id: number): Promise<boolean> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), status: CustomerStatus.INACTIVE },
    });
    return count > 0;
  }

  // Khôi phục tài khoản khách hàng từ trạng thái xóa mềm.
  // Sau khi khôi phục, tài khoản ở trạng thái INACTIVE để admin chủ động kích hoạt lại nếu cần.
  async restore(id: number): Promise<CustomerDetailView | null> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, NOT: { deletedAt: null } },
      data: { deletedAt: null, status: CustomerStatus.INACTIVE },
    });
    if (count === 0) return null;
    return this.findById(id);
  }
}
