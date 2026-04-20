import { Injectable } from '@nestjs/common';
import type { RefreshToken } from 'generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateRefreshTokenData {
  tokenHash: string;
  customerId?: number;
  employeeId?: number;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
}

/**
 * Repository quản lý mã làm mới (Refresh Token) trong cơ sở dữ liệu.
 * Chịu trách nhiệm tạo, truy vấn và thu hồi (revoke) các refresh token để quản lý phiên đăng nhập.
 */
@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo mới một bản ghi Refresh Token.
   */
  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  /**
   * Tìm kiếm Refresh Token bằng mã băm (hash).
   */
  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  /**
   * Thu hồi một Refresh Token cụ thể bằng ID.
   */
  async revokeById(id: number): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Kiểm tra và thu hồi Refresh Token nếu nó còn hiệu lực.
   * Sử dụng để ngăn chặn việc sử dụng lại token cũ khi thực hiện làm mới (refreshing).
   */
  async consumeIfActive(id: number): Promise<boolean> {
    const now = new Date();
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    return count === 1;
  }

  /**
   * Thu hồi Refresh Token bằng mã băm.
   */
  async revokeByHash(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Thu hồi tất cả Refresh Token của một người dùng (đăng xuất khỏi tất cả thiết bị).
   */
  async revokeAllByUser(userId: number, userType: 'CUSTOMER' | 'EMPLOYEE'): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        ...(userType === 'CUSTOMER' ? { customerId: userId } : { employeeId: userId }),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}
