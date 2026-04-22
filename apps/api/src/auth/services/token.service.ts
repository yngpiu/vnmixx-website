import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { EmployeeStatus } from '../../../generated/prisma/client';
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
// Service quản lý vòng đời của các loại Token xác thực.
// Chịu trách nhiệm: Cấp cặp Access Token/Refresh Token, Làm mới (Rotation),
// Thu hồi (Logout) và Blacklist Access Token thông qua Redis.
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

  // Cấp cặp Access Token (JWT) và Refresh Token (UUID) mới.
  // Logic: Tạo JWT payload (sub, userType, jti) -> Lưu hash Refresh Token vào Database -> Trả về cặp token.
  async issueTokenPair(
    user: TokenIdentity,
    userType: 'CUSTOMER' | 'EMPLOYEE',
    meta: RequestMeta,
  ): Promise<TokenPair> {
    // 1. Tạo JTI (JWT ID) duy nhất để định danh cho phiên đăng nhập này
    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      userType,
      jti,
    };
    // 2. Ký JWT Access Token với thời hạn đã cấu hình
    const accessToken = this.jwt.sign(payload, { expiresIn: this.accessExpiration });
    // 3. Tạo Refresh Token ngẫu nhiên và băm (hash) để lưu trữ an toàn trong Database
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

  // Làm mới Access Token bằng Refresh Token (Token Rotation).
  // Logic: Kiểm tra tính hợp lệ/hết hạn của Refresh Token -> Thu hồi (revoke) token cũ -> Cấp cặp token mới.
  // Chống tấn công Replay: Nếu phát hiện Refresh Token đã bị thu hồi trước đó, xóa tất cả phiên đăng nhập của người dùng.
  async refreshTokens(refreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    // 1. Tìm thông tin Refresh Token trong DB thông qua mã băm (hash)
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepo.findByHash(tokenHash);
    if (!storedToken) {
      throw new UnauthorizedException('Mã làm mới không hợp lệ hoặc đã hết hạn');
    }
    const isCustomer = storedToken.customerId !== null;
    const ownerId = isCustomer ? storedToken.customerId! : storedToken.employeeId!;
    const ownerType: 'CUSTOMER' | 'EMPLOYEE' = isCustomer ? 'CUSTOMER' : 'EMPLOYEE';

    // 2. Kiểm tra Re-use Detection: Nếu token đã bị thu hồi (revoked), thu hồi toàn bộ các phiên còn lại của người dùng đó (đề phòng lộ token)
    if (storedToken.revokedAt) {
      this.logger.warn(`Mã làm mới reuse detected for ${ownerType}:${ownerId}`);
      await this.refreshTokenRepo.revokeAllByUser(ownerId, ownerType);
      throw new UnauthorizedException('Mã làm mới không hợp lệ hoặc đã hết hạn');
    }
    // 3. Kiểm tra thời hạn hết hạn của Refresh Token
    if (storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Mã làm mới không hợp lệ hoặc đã hết hạn');
    }
    // 4. Thực hiện tiêu thụ (consume) token cũ để chuẩn bị cho quá trình cấp mới (Token Rotation)
    const consumed = await this.refreshTokenRepo.consumeIfActive(storedToken.id);
    if (!consumed) {
      this.logger.warn(`Mã làm mới was already consumed concurrently for ${ownerType}:${ownerId}`);
      throw new UnauthorizedException('Mã làm mới không hợp lệ hoặc đã hết hạn');
    }
    // 5. Cấp cặp Access/Refresh Token mới dựa trên loại người dùng
    if (isCustomer) {
      return this.refreshCustomerTokens(ownerId, meta);
    }
    return this.refreshEmployeeTokens(ownerId, meta);
  }

  // Đăng nhập ra (Logout) phiên hiện tại.
  // Logic: Thu hồi Refresh Token trong DB -> Thêm jti của Access Token vào Blacklist trong Redis.
  async logout(
    refreshToken: string | undefined,
    accessTokenJti: string,
    accessTokenExp: number,
  ): Promise<void> {
    // 1. Thu hồi Refresh Token trong DB nếu có cung cấp
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.refreshTokenRepo.revokeByHash(tokenHash);
    }
    // 2. Đưa Access Token vào danh sách đen (Blacklist) trong Redis để vô hiệu hóa ngay lập tức
    await this.blacklistAccessToken(accessTokenJti, accessTokenExp);
  }

  // Đăng xuất khỏi tất cả các thiết bị.
  // Logic: Thu hồi toàn bộ Refresh Token của người dùng -> Đánh dấu mốc thời gian logout-all trong Redis.
  async logoutAll(
    userId: number,
    userType: 'CUSTOMER' | 'EMPLOYEE',
    accessTokenJti: string,
    accessTokenExp: number,
  ): Promise<void> {
    // 1. Thu hồi toàn bộ Refresh Token của người dùng trong DB
    await this.refreshTokenRepo.revokeAllByUser(userId, userType);
    // 2. Đánh dấu mốc thời gian "Logout All" trong Redis để các Access Token cũ không còn hiệu lực
    await this.markAllSessionsLoggedOut(userId, userType);
    // 3. Blacklist Access Token hiện tại
    await this.blacklistAccessToken(accessTokenJti, accessTokenExp);
  }

  // Thu hồi toàn bộ phiên đăng nhập (Dùng cho các trường hợp đặc biệt như Reset mật khẩu).
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
    if (!employee || employee.status !== EmployeeStatus.ACTIVE || employee.deletedAt) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa hoặc đã bị xóa');
    }
    return this.issueTokenPair(
      { id: employee.id, email: employee.email, fullName: employee.fullName },
      'EMPLOYEE',
      meta,
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
