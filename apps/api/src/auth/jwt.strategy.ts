import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EmployeeStatus } from '../../generated/prisma/client';
import { RedisService } from '../redis/redis.service';
import { BLACKLIST_PREFIX, LOGOUT_ALL_PREFIX } from './constants';
import type { AuthenticatedUser, JwtPayload } from './interfaces';
import { CustomerRepository } from './repositories/customer.repository';
import { EmployeeRepository } from './repositories/employee.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly customerRepo: CustomerRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Called by Passport after the JWT signature is verified.
   * Returns the user object that will be attached to `request.user`.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    this.assertRequiredClaims(payload);
    await this.assertNotBlacklisted(payload.jti);
    await this.assertNotLoggedOutAll(payload);
    if (payload.userType === 'CUSTOMER') return this.validateCustomer(payload);
    return this.validateEmployee(payload);
  }

  private assertRequiredClaims(payload: JwtPayload): void {
    const isKnownUserType = payload.userType === 'CUSTOMER' || payload.userType === 'EMPLOYEE';
    if (!payload.jti || !isKnownUserType || typeof payload.sub !== 'number') {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') {
      throw new UnauthorizedException('Token không hợp lệ');
    }
  }

  private async assertNotBlacklisted(jti: string | undefined): Promise<void> {
    if (!jti) throw new UnauthorizedException('Token không hợp lệ');
    const isBlacklisted = await this.redis.getClient().exists(`${BLACKLIST_PREFIX}${jti}`);
    if (isBlacklisted) throw new UnauthorizedException('Token đã bị thu hồi');
  }

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

  private async validateEmployee(payload: JwtPayload): Promise<AuthenticatedUser> {
    const employee = await this.employeeRepo.findById(payload.sub);
    if (!employee || employee.status !== EmployeeStatus.ACTIVE || employee.deletedAt) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa hoặc đã bị xóa');
    }
    return {
      id: employee.id,
      email: employee.email,
      fullName: employee.fullName,
      avatarUrl: employee.avatarUrl,
      userType: 'EMPLOYEE',
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      jti: payload.jti!,
      exp: payload.exp!,
      iat: payload.iat!,
    };
  }
}
