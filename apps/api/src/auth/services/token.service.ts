import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { getPositiveIntConfig } from '../../common/utils/config.util';
import { RedisService } from '../../redis/redis.service';
import {
  BLACKLIST_PREFIX,
  DEFAULT_ACCESS_EXPIRATION,
  DEFAULT_REFRESH_EXPIRATION,
  LOGOUT_ALL_PREFIX,
} from '../constants';
import type { AuthResponse } from '../dto';
import type { JwtPayload, RequestMeta } from '../interfaces';
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
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.accessExpiration = getPositiveIntConfig(
      this.config,
      'JWT_ACCESS_EXPIRATION',
      DEFAULT_ACCESS_EXPIRATION,
    );
    this.refreshExpiration = getPositiveIntConfig(
      this.config,
      'JWT_REFRESH_EXPIRATION',
      DEFAULT_REFRESH_EXPIRATION,
    );
  }

  /** Issue a new access + refresh token pair for the given user identity. */
  async issueTokenPair(
    user: TokenIdentity,
    userType: 'CUSTOMER' | 'EMPLOYEE',
    meta: RequestMeta,
    roles: string[] = [],
    permissions: string[] = [],
  ): Promise<AuthResponse> {
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
      userId: user.id,
      userType,
      deviceInfo: meta.deviceInfo ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt: new Date(Date.now() + this.refreshExpiration * 1000),
    });
    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: this.accessExpiration,
      userType,
    };
  }

  /** Exchange a valid refresh token for a new token pair (rotation). */
  async refreshTokens(refreshToken: string, meta: RequestMeta): Promise<AuthResponse> {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepo.findByHash(tokenHash);
    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (storedToken.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for ${storedToken.userType}:${storedToken.userId}`,
      );
      await this.refreshTokenRepo.revokeAllByUser(storedToken.userId, storedToken.userType);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const consumed = await this.refreshTokenRepo.consumeIfActive(storedToken.id);
    if (!consumed) {
      this.logger.warn(
        `Refresh token was already consumed concurrently for ${storedToken.userType}:${storedToken.userId}`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (storedToken.userType === 'CUSTOMER') {
      return this.refreshCustomerTokens(storedToken.userId, meta);
    }
    return this.refreshEmployeeTokens(storedToken.userId, meta);
  }

  /** Revoke a single refresh token and blacklist the current access token. */
  async logout(
    refreshToken: string,
    accessTokenJti: string,
    accessTokenExp: number,
  ): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepo.revokeByHash(tokenHash);
    await this.blacklistAccessToken(accessTokenJti, accessTokenExp);
  }

  /** Revoke ALL refresh tokens for a user and blacklist current access token. */
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

  private async refreshCustomerTokens(userId: number, meta: RequestMeta): Promise<AuthResponse> {
    const customer = await this.customerRepo.findById(userId);
    if (!customer || !customer.isActive || customer.deletedAt) {
      throw new UnauthorizedException('Account is inactive or deleted');
    }
    return this.issueTokenPair(
      { id: customer.id, email: customer.email, fullName: customer.fullName },
      'CUSTOMER',
      meta,
    );
  }

  private async refreshEmployeeTokens(userId: number, meta: RequestMeta): Promise<AuthResponse> {
    const employee = await this.employeeRepo.findById(userId);
    if (!employee || !employee.isActive || employee.deletedAt) {
      throw new UnauthorizedException('Account is inactive or deleted');
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
