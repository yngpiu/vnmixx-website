import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type { UpdateCustomerDto } from '../dto/update-customer.dto';
import {
  CustomerRepository,
  type CustomerDetailView,
  type CustomerListItemView,
  type PaginatedResult,
} from '../repositories/customer.repository';

// Service quản lý khách hàng cho cấp độ quản trị (Admin).
// Chịu trách nhiệm thực thi các logic nghiệp vụ như lọc danh sách, kiểm soát trạng thái hoạt động và xử lý xóa mềm khách hàng.
@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Truy vấn danh sách khách hàng có phân trang, lọc theo trạng thái và tìm kiếm từ khóa.
  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    isSoftDeleted?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<CustomerListItemView>> {
    return this.customerRepo.findList(params);
  }

  // Lấy chi tiết thông tin khách hàng qua ID, báo lỗi nếu không tồn tại.
  async findById(id: number): Promise<CustomerDetailView> {
    const customer = await this.customerRepo.findById(id);
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');
    return customer;
  }

  // Cập nhật thông tin khách hàng (chủ yếu là trạng thái isActive).
  // Ghi Audit Log để theo dõi các thay đổi trạng thái tài khoản quan trọng.
  async update(
    id: number,
    dto: UpdateCustomerDto,
    auditContext: AuditRequestContext = {},
  ): Promise<CustomerDetailView> {
    const beforeData = await this.customerRepo.findById(id);
    try {
      // 1. Kiểm tra dữ liệu đầu vào: trạng thái hoạt động là thông tin bắt buộc
      if (dto.isActive === undefined) {
        throw new BadRequestException('Cần cung cấp trạng thái hoạt động');
      }

      // 2. Thực hiện cập nhật trạng thái của khách hàng trong DB
      const updated = await this.customerRepo.update(id, { isActive: dto.isActive });
      if (!updated) throw new NotFoundException('Không tìm thấy khách hàng');

      // 3. Ghi lại nhật ký thay đổi trạng thái tài khoản để phục vụ công tác kiểm soát (Security Auditing)
      await this.auditLogService.write({
        ...auditContext,
        action: 'customer.update',
        resourceType: 'customer',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: updated,
      });
      return updated;
    } catch (error) {
      // 4. Ghi nhận lỗi cập nhật vào nhật ký hệ thống
      await this.auditLogService.write({
        ...auditContext,
        action: 'customer.update',
        resourceType: 'customer',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Xử lý xóa mềm khách hàng: Đánh dấu `deletedAt` và đặt `isActive` về false.
  async softDelete(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.customerRepo.findById(id);
    try {
      // 1. Thực hiện xóa mềm trong DB (không xóa vĩnh viễn dữ liệu khách hàng)
      const deleted = await this.customerRepo.softDelete(id);
      if (!deleted) throw new NotFoundException('Không tìm thấy khách hàng');

      const afterData = await this.customerRepo.findById(id);

      // 2. Ghi nhật ký thao tác xóa thành công kèm dữ liệu đối soát
      await this.auditLogService.write({
        ...auditContext,
        action: 'customer.delete',
        resourceType: 'customer',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: afterData ?? undefined,
      });
    } catch (error) {
      // 3. Ghi nhận lỗi xóa vào nhật ký hệ thống
      await this.auditLogService.write({
        ...auditContext,
        action: 'customer.delete',
        resourceType: 'customer',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Khôi phục khách hàng từ trạng thái xóa mềm.
  async restore(id: number, auditContext: AuditRequestContext = {}): Promise<CustomerDetailView> {
    const beforeData = await this.customerRepo.findById(id);
    if (!beforeData) throw new NotFoundException('Không tìm thấy khách hàng');

    try {
      // 1. Thực hiện khôi phục bản ghi đã xóa trong cơ sở dữ liệu
      const restored = await this.customerRepo.restore(id);
      if (!restored)
        throw new NotFoundException('Không tìm thấy khách hàng hoặc bản ghi chưa bị xóa.');

      // 2. Ghi nhật ký khôi phục tài khoản thành công
      await this.auditLogService.write({
        ...auditContext,
        action: 'customer.restore',
        resourceType: 'customer',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: restored,
      });
      return restored;
    } catch (error) {
      // 3. Ghi nhận lỗi khôi phục vào nhật ký hệ thống
      await this.auditLogService.write({
        ...auditContext,
        action: 'customer.restore',
        resourceType: 'customer',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
