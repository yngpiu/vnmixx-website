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
import { EmployeeAuthzCacheService } from '../../auth/services/employee-authz-cache.service';
import {
  getPrismaErrorTargets,
  isPrismaErrorCode,
  isPrismaKnownRequestError,
} from '../../common/utils/prisma.util';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { RedisService } from '../../redis/services/redis.service';
import type { CreateEmployeeDto } from '../dto/create-employee.dto';
import type { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EMPLOYEE_CACHE_KEYS, EMPLOYEE_CACHE_TTL } from '../employee.cache';
import {
  EmployeeRepository,
  type EmployeeDetailView,
  type EmployeeListItemView,
  type PaginatedResult,
} from '../repositories/employee.repository';

const BCRYPT_ROUNDS = 10;

@Injectable()
// Service xử lý logic nghiệp vụ cho nhân viên - Quản lý tài khoản, mật khẩu và vai trò
export class EmployeeService {
  constructor(
    private readonly employeeRepo: EmployeeRepository,
    private readonly roleRepo: RoleRepository,
    private readonly employeeAuthzCache: EmployeeAuthzCacheService,
    private readonly auditLogService: AuditLogService,
    private readonly redis: RedisService,
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

  // Tìm kiếm một nhân viên theo ID và báo lỗi nếu không tồn tại, có sử dụng cache
  async findById(id: number): Promise<EmployeeDetailView> {
    const employee = await this.redis.getOrSet(
      EMPLOYEE_CACHE_KEYS.DETAIL(id),
      EMPLOYEE_CACHE_TTL.DETAIL,
      () => this.employeeRepo.findById(id),
    );
    if (!employee) throw new NotFoundException(`Không tìm thấy nhân viên #${id}`);
    return employee;
  }

  // Tạo nhân viên mới, mã hóa mật khẩu và gán vai trò ban đầu
  async create(
    dto: CreateEmployeeDto,
    auditContext: AuditRequestContext = {},
  ): Promise<EmployeeDetailView> {
    try {
      // 1. Mã hóa mật khẩu nhân viên bằng Bcrypt để đảm bảo an toàn thông tin
      const hashedPassword = await hash(dto.password, BCRYPT_ROUNDS);
      // 2. Kiểm tra sự tồn tại của vai trò trước khi gán để đảm bảo tính toàn vẹn dữ liệu
      const roleId = dto.roleId;
      await this.ensureRoleIdExists(roleId);
      // 3. Lưu thông tin nhân viên mới vào cơ sở dữ liệu
      const createdEmployee = await this.employeeRepo.create({
        roleId,
        fullName: dto.fullName,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        hashedPassword,
      });
      // 4. Ghi lại nhật ký hệ thống về thao tác tạo nhân viên thành công
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
      // 5. Ghi nhận lỗi vào nhật ký nếu quá trình tạo thất bại
      await this.auditLogService.write({
        ...auditContext,
        action: 'employee.create',
        resourceType: 'employee',
        status: AuditLogStatus.FAILED,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      // 6. Xử lý các lỗi vi phạm ràng buộc duy nhất (email, số điện thoại)
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
      const hasRoleId = dto.roleId !== undefined;
      // 1. Kiểm tra đầu vào: phải có ít nhất một thông tin cần thay đổi
      if (!hasStatus && !hasRoleId) {
        throw new BadRequestException(
          'Cần cung cấp ít nhất một thông tin để cập nhật (trạng thái hoặc vai trò)',
        );
      }
      const updateData: Prisma.EmployeeUpdateInput = {};
      // 2. Cập nhật trạng thái tài khoản (ACTIVE/INACTIVE) nếu có yêu cầu
      if (hasStatus) {
        updateData.status = dto.status!;
      }
      // 3. Kiểm tra và gán vai trò mới cho nhân viên nếu có yêu cầu
      if (hasRoleId) {
        await this.ensureRoleIdExists(dto.roleId!);
        updateData.role = { connect: { id: dto.roleId! } };
      }
      // 4. Thực hiện cập nhật dữ liệu trong DB
      await this.employeeRepo.update(id, updateData);
      // 5. Thu hồi cache phân quyền và cache thông tin của nhân viên
      await Promise.all([
        this.employeeAuthzCache.invalidate(id),
        this.redis.del(EMPLOYEE_CACHE_KEYS.DETAIL(id)),
      ]);
      const afterData = await this.findById(id);
      // 6. Ghi nhận nhật ký cập nhật thành công kèm theo dữ liệu trước và sau khi đổi
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
      // 7. Ghi nhận lỗi cập nhật vào nhật ký hệ thống
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
      // 1. Bảo vệ tài khoản quản trị tối cao (mặc định ID 1) không bao giờ bị xóa
      if (id === 1) {
        throw new BadRequestException(
          'Không được phép xóa tài khoản quản trị tối cao của hệ thống',
        );
      }
      // 2. Đảm bảo nhân viên không tự thực hiện hành động xóa tài khoản của chính mình
      if (currentActorId && id === currentActorId) {
        throw new BadRequestException('Bạn không thể tự xóa tài khoản của chính mình');
      }
      // 3. Thực hiện xóa mềm trong DB (đánh dấu trường deletedAt)
      const deleted = await this.employeeRepo.softDelete(id);
      if (!deleted) throw new NotFoundException(`Không tìm thấy nhân viên #${id} để xóa`);
      // 4. Thu hồi cache của nhân viên để ngăn chặn truy cập sau khi bị xóa
      await Promise.all([
        this.employeeAuthzCache.invalidate(id),
        this.redis.del(EMPLOYEE_CACHE_KEYS.DETAIL(id)),
      ]);
      const afterData = await this.employeeRepo.findById(id);
      // 5. Ghi nhận nhật ký xóa thành công
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
      // 6. Ghi nhận lỗi xóa vào nhật ký hệ thống
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
      // 1. Thực hiện khôi phục bản ghi trong cơ sở dữ liệu
      const restored = await this.employeeRepo.restore(id);
      if (!restored) {
        throw new BadRequestException(
          `Nhân viên #${id} không ở trạng thái bị xóa hoặc không tồn tại`,
        );
      }
      // 2. Thu hồi cache để hệ thống nhận diện lại nhân viên
      await Promise.all([
        this.employeeAuthzCache.invalidate(id),
        this.redis.del(EMPLOYEE_CACHE_KEYS.DETAIL(id)),
      ]);
      // 3. Ghi nhận nhật ký khôi phục thành công
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
      // 4. Ghi nhận lỗi khôi phục vào nhật ký hệ thống
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
    if (isPrismaErrorCode(err, 'P2002') && isPrismaKnownRequestError(err)) {
      const target = getPrismaErrorTargets(err).join(',').toLowerCase();
      if (target.includes('email')) {
        throw new ConflictException('Email này đã được đăng ký cho một nhân viên khác');
      }
      if (target.includes('phone')) {
        throw new ConflictException('Số điện thoại này đã được sử dụng');
      }
      throw new ConflictException('Thông tin nhân viên bị trùng lặp dữ liệu duy nhất');
    }
  }

  // Kiểm tra sự tồn tại của vai trò trước khi gán
  private async ensureRoleIdExists(roleId: number): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new BadRequestException(`Vai trò #${roleId} không tồn tại`);
    }
  }
}
