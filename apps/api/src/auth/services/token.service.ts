import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { RedisService } from '../../redis/redis.service';
import {
  BLACKLIST_PREFIX,
  DEFAULT_ACCESS_EXPIRATION,
  DEFAULT_REFRESH_EXPIRATION,
  LOGOUT_ALL_PREFIX,
} from '../constants';
import type { JwtPayload, RequestMeta, TokenPair } from '../interfaces';
import { CustomerRepository } from '../repositories/customer.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

export interface TokenIdentity {
  id: number;
  email: string;
  fullName: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessExpiration: number;
  private readonly refreshExpiration: number;

  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {
    this.accessExpiration = DEFAULT_ACCESS_EXPIRATION;
    this.refreshExpiration = DEFAULT_REFRESH_EXPIRATION;
  }

  /** Issue a new access + refresh token pair for the given user identity. */
  async issueTokenPair(
    user: TokenIdentity,
    userType: 'CUSTOMER' | 'EMPLOYEE',
    meta: RequestMeta,
    roles: string[] = [],
    permissions: string[] = [],
  ): Promise<TokenPair> {
    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      userType,
      roles,
      permissions,
      jti,
    };
    const accessToken = this.jwt.sign(payload, { expiresIn: this.accessExpiration });
    const rawRefreshToken = randomUUID();
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokenRepo.create({
      tokenHash,
      ...(userType === 'CUSTOMER' ? { customerId: user.id } : { employeeId: user.id }),
      deviceInfo: meta.deviceInfo ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt: new Date(Date.now() + this.refreshExpiration * 1000),
    });
    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: this.accessExpiration,
    };
  }

  /** Exchange a valid refresh token for a new token pair (rotation). */
  async refreshTokens(refreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepo.findByHash(tokenHash);
    if (!storedToken) {
      throw new UnauthorizedException('Mã làm mới không hợp lệ hoặc đã hết hạn');
    }
    const isCustomer = storedToken.customerId !== null;
    const ownerId = isCustomer ? storedToken.customerId! : storedToken.employeeId!;
    const ownerType: 'CUSTOMER' | 'EMPLOYEE' = isCustomer ? 'CUSTOMER' : 'EMPLOYEE';

    if (storedToken.revokedAt) {
      this.logger.warn(`Mã làm mới reuse detected for ${ownerType}:${ownerId}`);
      await this.refreshTokenRepo.revokeAllByUser(ownerId, ownerType);
      throw new UnauthorizedException('Mã làm mới không hợp lệ hoặc đã hết hạn');
    }
    if (storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Mã làm mới không hợp lệ hoặc đã hết hạn');
    }
    const consumed = await this.refreshTokenRepo.consumeIfActive(storedToken.id);
    if (!consumed) {
      this.logger.warn(`Mã làm mới was already consumed concurrently for ${ownerType}:${ownerId}`);
      throw new UnauthorizedException('Mã làm mới không hợp lệ hoặc đã hết hạn');
    }
    if (isCustomer) {
      return this.refreshCustomerTokens(ownerId, meta);
    }
    return this.refreshEmployeeTokens(ownerId, meta);
  }

  /** Revoke a single refresh token and blacklist the current mã truy cập. */
  async logout(
    refreshToken: string | undefined,
    accessTokenJti: string,
    accessTokenExp: number,
  ): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.refreshTokenRepo.revokeByHash(tokenHash);
    }
    await this.blacklistAccessToken(accessTokenJti, accessTokenExp);
  }

  /** Revoke ALL refresh tokens for a user and blacklist current mã truy cập. */
  async logoutAll(
    userId: number,
    userType: 'CUSTOMER' | 'EMPLOYEE',
    accessTokenJti: string,
    accessTokenExp: number,
  ): Promise<void> {
    await this.refreshTokenRepo.revokeAllByUser(userId, userType);
    await this.markAllSessionsLoggedOut(userId, userType);
    await this.blacklistAccessToken(accessTokenJti, accessTokenExp);
  }

  /**
   * Revoke all refresh tokens and invalidate all active JWTs for a user without
   * requiring the caller to hold a current mã truy cập (e.g. after password reset).
   */
  async revokeAllSessions(userId: number, userType: 'CUSTOMER' | 'EMPLOYEE'): Promise<void> {
    await this.refreshTokenRepo.revokeAllByUser(userId, userType);
    await this.markAllSessionsLoggedOut(userId, userType);
  }

  private async refreshCustomerTokens(userId: number, meta: RequestMeta): Promise<TokenPair> {
    const customer = await this.customerRepo.findById(userId);
    if (!customer || !customer.isActive || customer.deletedAt) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa hoặc đã bị xóa');
    }
    return this.issueTokenPair(
      { id: customer.id, email: customer.email, fullName: customer.fullName },
      'CUSTOMER',
      meta,
    );
  }

  private async refreshEmployeeTokens(userId: number, meta: RequestMeta): Promise<TokenPair> {
    const employee = await this.employeeRepo.findById(userId);
    if (!employee || !employee.isActive || employee.deletedAt) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa hoặc đã bị xóa');
    }
    const { roles, permissions } = await this.employeeRepo.loadPermissions(employee.id);
    return this.issueTokenPair(
      { id: employee.id, email: employee.email, fullName: employee.fullName },
      'EMPLOYEE',
      meta,
      roles,
      permissions,
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async blacklistAccessToken(jti: string, exp: number): Promise<void> {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.getClient().setex(`${BLACKLIST_PREFIX}${jti}`, ttl, '1');
    }
  }

  private async markAllSessionsLoggedOut(
    userId: number,
    userType: 'CUSTOMER' | 'EMPLOYEE',
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const key = `${LOGOUT_ALL_PREFIX}${userType}:${userId}`;
    await this.redis.getClient().setex(key, this.accessExpiration, String(now));
  }
}
