import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EmployeeStatus } from '../../generated/prisma/client';
import { RedisService } from '../redis/services/redis.service';
import { BLACKLIST_PREFIX, LOGOUT_ALL_PREFIX } from './constants';
import type { AuthenticatedUser, JwtPayload } from './interfaces';
import { CustomerRepository } from './repositories/customer.repository';
import { EmployeeRepository } from './repositories/employee.repository';
import { EmployeeAuthzCacheService } from './services/employee-authz-cache.service';

/**
 * Chiến lược xác thực JWT (JWT Strategy).
 * Chịu trách nhiệm trích xuất và kiểm tra tính hợp lệ của mã thông báo JWT từ yêu cầu.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly customerRepo: CustomerRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly employeeAuthzCache: EmployeeAuthzCacheService,
    private readonly redis: RedisService,
  ) {
    super({
      // Trích xuất JWT từ tiêu đề Authorization theo định dạng Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Phương thức được gọi bởi Passport sau khi chữ ký JWT đã được xác minh.
   * Logic kiểm tra bổ sung như: danh sách đen (blacklist), trạng thái tài khoản, và quyền hạn.
   * Kết quả trả về sẽ được gán vào `request.user`.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    this.assertRequiredClaims(payload);
    // Kiểm tra xem token có nằm trong danh sách đen (đã logout) không
    await this.assertNotBlacklisted(payload.jti);
    // Kiểm tra xem phiên đăng nhập có bị chấm dứt do yêu cầu "đăng xuất khỏi tất cả thiết bị" không
    await this.assertNotLoggedOutAll(payload);

    if (payload.userType === 'CUSTOMER') return this.validateCustomer(payload);
    return this.validateEmployee(payload);
  }

  /**
   * Đảm bảo các thông tin bắt buộc (Claims) có mặt trong payload của JWT.
   */
  private assertRequiredClaims(payload: JwtPayload): void {
    const isKnownUserType = payload.userType === 'CUSTOMER' || payload.userType === 'EMPLOYEE';
    if (!payload.jti || !isKnownUserType || typeof payload.sub !== 'number') {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') {
      throw new UnauthorizedException('Token không hợp lệ');
    }
  }

  /**
   * Kiểm tra token ID (jti) trong Redis để xác định xem nó có bị thu hồi hay không.
   */
  private async assertNotBlacklisted(jti: string | undefined): Promise<void> {
    if (!jti) throw new UnauthorizedException('Token không hợp lệ');
    const isBlacklisted = await this.redis.getClient().exists(`${BLACKLIST_PREFIX}${jti}`);
    if (isBlacklisted) throw new UnauthorizedException('Token đã bị thu hồi');
  }

  /**
   * Kiểm tra xem người dùng có thực hiện hành động đăng xuất toàn cục trước thời điểm token được phát hành hay không.
   */
  private async assertNotLoggedOutAll(payload: JwtPayload): Promise<void> {
    const key = `${LOGOUT_ALL_PREFIX}${payload.userType}:${payload.sub}`;
    const logoutAllAt = await this.redis.getClient().get(key);
    if (!logoutAllAt) return;
    const timestamp = Number(logoutAllAt);
    if (!Number.isFinite(timestamp)) return;
    if ((payload.iat ?? 0) <= timestamp) {
      throw new UnauthorizedException('Phiên đăng nhập đã bị chấm dứt');
    }
  }

  /**
   * Xác thực và tải thông tin chi tiết cho khách hàng (Customer).
   */
  private async validateCustomer(payload: JwtPayload): Promise<AuthenticatedUser> {
    const customer = await this.customerRepo.findById(payload.sub);
    if (!customer || !customer.isActive || customer.deletedAt) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa hoặc đã bị xóa');
    }
    return {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      avatarUrl: customer.avatarUrl,
      userType: 'CUSTOMER',
      roles: [],
      permissions: [],
      jti: payload.jti!,
      exp: payload.exp!,
      iat: payload.iat!,
    };
  }

  /**
   * Xác thực và tải thông tin chi tiết kèm quyền hạn (RBAC) cho nhân viên (Employee).
   */
  private async validateEmployee(payload: JwtPayload): Promise<AuthenticatedUser> {
    const employee = await this.employeeRepo.findById(payload.sub);
    if (!employee || employee.status !== EmployeeStatus.ACTIVE || employee.deletedAt) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa hoặc đã bị xóa');
    }
    // Lấy danh sách vai trò và quyền hạn từ Cache (hoặc DB nếu chưa có cache)
    const { roles, permissions } = await this.employeeAuthzCache.getRolesAndPermissions(
      employee.id,
    );
    return {
      id: employee.id,
      email: employee.email,
      fullName: employee.fullName,
      avatarUrl: employee.avatarUrl,
      userType: 'EMPLOYEE',
      roles,
      permissions,
      jti: payload.jti!,
      exp: payload.exp!,
      iat: payload.iat!,
    };
  }
}
