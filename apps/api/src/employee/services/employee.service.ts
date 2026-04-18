import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { AuditLogStatus, EmployeeStatus, Prisma } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { EmployeeRoleService } from '../../rbac/services/employee-role.service';
import type { CreateEmployeeDto } from '../dto/create-employee.dto';
import type { UpdateEmployeeDto } from '../dto/update-employee.dto';
import {
  EmployeeRepository,
  type EmployeeDetailView,
  type EmployeeListItemView,
  type PaginatedResult,
} from '../repositories/employee.repository';

const BCRYPT_ROUNDS = 10;

// Service xử lý logic nghiệp vụ cho nhân viên - Quản lý tài khoản, mật khẩu và vai trò
@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepo: EmployeeRepository,
    private readonly employeeRoleService: EmployeeRoleService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Lấy danh sách nhân viên có phân trang, tìm kiếm và lọc tiêu chí
  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    status?: EmployeeStatus;
    isSoftDeleted?: boolean;
    roleId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<EmployeeListItemView>> {
    return this.employeeRepo.findList(params);
  }

  // Tìm kiếm một nhân viên theo ID và báo lỗi nếu không tồn tại
  async findById(id: number): Promise<EmployeeDetailView> {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) throw new NotFoundException(`Không tìm thấy nhân viên #${id}`);
    return employee;
  }

  // Tạo nhân viên mới, mã hóa mật khẩu và gán vai trò ban đầu
  async create(
    dto: CreateEmployeeDto,
    auditContext: AuditRequestContext = {},
  ): Promise<EmployeeDetailView> {
    try {
      // Mã hóa mật khẩu nhân viên
      const hashedPassword = await hash(dto.password, BCRYPT_ROUNDS);

      // Kiểm tra các vai trò gửi lên có tồn tại trong hệ thống không
      if (dto.roleIds?.length) {
        await this.employeeRoleService.ensureRoleIdsExist(dto.roleIds);
      }

      // Tạo bản ghi nhân viên cơ bản
      const created = await this.employeeRepo.create({
        fullName: dto.fullName,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        hashedPassword,
      });

      // Nếu có vai trò, thực hiện đồng bộ vai trò và lấy lại dữ liệu chi tiết
      const createdEmployee = dto.roleIds?.length
        ? await this.employeeRoleService
            .syncRoles(created.id, dto.roleIds)
            .then(() => this.findById(created.id))
        : created;

      // Ghi nhật ký thao tác thành công
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.create',
        resourceType: 'employee',
        resourceId: String(createdEmployee.id),
        status: AuditLogStatus.SUCCESS,
        afterData: createdEmployee,
      });

      return createdEmployee;
    } catch (error) {
      // Ghi nhật ký thao tác thất bại
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.create',
        resourceType: 'employee',
        status: AuditLogStatus.FAILED,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  // Cập nhật trạng thái hoặc thay đổi danh sách vai trò của nhân viên
  async update(
    id: number,
    dto: UpdateEmployeeDto,
    auditContext: AuditRequestContext = {},
  ): Promise<EmployeeDetailView> {
    const beforeData = await this.findById(id);
    try {
      const hasStatus = dto.status !== undefined;
      const hasRoleIds = dto.roleIds !== undefined;

      if (!hasStatus && !hasRoleIds) {
        throw new BadRequestException(
          'Cần cung cấp ít nhất một thông tin để cập nhật (trạng thái hoặc vai trò)',
        );
      }

      // Cập nhật trạng thái tài khoản (ACTIVE/INACTIVE)
      if (hasStatus) {
        const nextStatus = dto.status!;
        await this.employeeRepo.update(id, {
          status: nextStatus,
        });
        // Khi thay đổi trạng thái, thu hồi cache phân quyền để áp dụng ngay lập tức
        await this.employeeRoleService.invalidateEmployeeAuthzCache(id);
      }

      // Cập nhật/Đồng bộ lại danh sách vai trò của nhân viên
      if (hasRoleIds) {
        await this.employeeRoleService.syncRoles(id, dto.roleIds!);
      }

      const afterData = await this.findById(id);

      // Ghi nhật ký thao tác thành công
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.update',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData,
      });

      return afterData;
    } catch (error) {
      // Ghi nhật ký thao tác thất bại
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.update',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Xóa mềm nhân viên - Đánh dấu là đã xóa và thu hồi quyền truy cập
  async softDelete(
    id: number,
    auditContext: AuditRequestContext = {},
    currentActorId?: number,
  ): Promise<void> {
    const beforeData = await this.findById(id);
    try {
      // Bảo vệ tài khoản quản trị tối cao (mặc định ID 1)
      if (id === 1) {
        throw new BadRequestException(
          'Không được phép xóa tài khoản quản trị tối cao của hệ thống',
        );
      }

      // Ngăn nhân viên tự xóa chính mình
      if (currentActorId && id === currentActorId) {
        throw new BadRequestException('Bạn không thể tự xóa tài khoản của chính mình');
      }

      const deleted = await this.employeeRepo.softDelete(id);
      if (!deleted) throw new NotFoundException(`Không tìm thấy nhân viên #${id} để xóa`);

      // Thu hồi cache phân quyền của nhân viên bị xóa
      await this.employeeRoleService.invalidateEmployeeAuthzCache(id);
      const afterData = await this.employeeRepo.findById(id);

      // Ghi nhật ký thao tác thành công
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.delete',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData,
      });
    } catch (error) {
      // Ghi nhật ký thao tác thất bại
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.delete',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Khôi phục nhân viên từ trạng thái đã xóa mềm
  async restore(id: number, auditContext: AuditRequestContext = {}): Promise<EmployeeDetailView> {
    const beforeData = await this.findById(id);
    try {
      const restored = await this.employeeRepo.restore(id);
      if (!restored) {
        throw new BadRequestException(
          `Nhân viên #${id} không ở trạng thái bị xóa hoặc không tồn tại`,
        );
      }

      // Xóa cache phân quyền để nhân viên có thể đăng nhập lại
      await this.employeeRoleService.invalidateEmployeeAuthzCache(id);

      // Ghi nhật ký thao tác thành công
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.restore',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: restored,
      });
      return restored;
    } catch (error) {
      // Ghi nhật ký thao tác thất bại
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.restore',
        resourceType: 'employee',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Xử lý lỗi vi phạm ràng buộc duy nhất (Email hoặc Số điện thoại) từ Database
  private handleUniqueViolation(err: unknown): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string) || '';
      if (target.includes('email')) {
        throw new ConflictException('Email này đã được đăng ký cho một nhân viên khác');
      }
      if (target.includes('phone')) {
        throw new ConflictException('Số điện thoại này đã được sử dụng');
      }
      throw new ConflictException('Thông tin nhân viên bị trùng lặp dữ liệu duy nhất');
    }
  }
}
