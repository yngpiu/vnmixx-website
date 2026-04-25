import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import type { JwtPayload } from '../auth/interfaces';

interface WsAuthenticatedData {
  userId: number;
  userType: 'CUSTOMER' | 'EMPLOYEE';
}

/**
 * WsJwtGuard: Guard xác thực JWT cho WebSocket connections.
 * Trích xuất token từ handshake `auth.token` và verify bằng JwtService.
 * Gán thông tin user vào `client.data` để gateway sử dụng.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);
    if (!token) {
      throw new WsException('Token xác thực không được cung cấp');
    }
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      if (!payload.sub || !payload.userType) {
        throw new WsException('Token không hợp lệ');
      }
      const authData: WsAuthenticatedData = {
        userId: payload.sub,
        userType: payload.userType,
      };
      client.data = { ...(client.data as Record<string, unknown>), ...authData };
      return true;
    } catch (err) {
      this.logger.warn(
        `WebSocket auth failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new WsException('Token xác thực không hợp lệ hoặc đã hết hạn');
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
    return undefined;
  }
}
