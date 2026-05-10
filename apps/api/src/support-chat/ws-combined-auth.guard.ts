import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WsGuestGuard } from './ws-guest.guard';
import { WsJwtGuard } from './ws-jwt.guard';

/**
 * WsCombinedAuthGuard: tries JWT auth first, falls back to guest cookie auth.
 * If both fail, throws WsException.
 */
@Injectable()
export class WsCombinedAuthGuard implements CanActivate {
  constructor(
    private readonly jwtGuard: WsJwtGuard,
    private readonly guestGuard: WsGuestGuard,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      return this.jwtGuard.canActivate(context);
    } catch {
      // JWT failed — try guest cookie
    }
    try {
      return this.guestGuard.canActivate(context);
    } catch {
      // Guest also failed
    }
    throw new WsException('Xác thực không thành công. Vui lòng đăng nhập hoặc thử lại.');
  }
}
