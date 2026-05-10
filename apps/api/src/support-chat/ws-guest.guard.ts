import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { createHash } from 'crypto';
import { Socket } from 'socket.io';
import { GUEST_CHAT_COOKIE_NAME } from './services/guest-session.service';

interface WsGuestData {
  userType: 'GUEST';
  guestSecretHash: string;
}

/**
 * WsGuestGuard: Guard xác thực guest qua cookie cho WebSocket.
 * Trích xuất `guest_chat_secret` từ handshake cookie, hash SHA-256,
 * và gán thông tin guest vào `client.data`.
 */
@Injectable()
export class WsGuestGuard implements CanActivate {
  private readonly logger = new Logger(WsGuestGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const secret = this.extractGuestSecret(client);
    if (!secret) {
      throw new WsException('Không tìm thấy phiên khách ẩn danh');
    }
    const guestSecretHash = createHash('sha256').update(secret).digest('hex');
    const guestData: WsGuestData = { userType: 'GUEST', guestSecretHash };
    client.data = { ...(client.data as Record<string, unknown>), ...guestData };
    return true;
  }

  private extractGuestSecret(client: Socket): string | undefined {
    const cookieHeader = client.handshake.headers?.cookie;
    if (!cookieHeader) return undefined;
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${GUEST_CHAT_COOKIE_NAME}=`));
    if (!match) return undefined;
    return match.split('=')[1] || undefined;
  }
}
