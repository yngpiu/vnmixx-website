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

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeById(id: number): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async consumeIfActive(id: number): Promise<boolean> {
    const now = new Date();
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    return count === 1;
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

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
