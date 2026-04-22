import type { Request } from 'express';
import type { AuthResponseDto } from './dto/session.dto';
import type { RequestMeta, TokenPair } from './interfaces';

export function extractRequestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    deviceInfo: req.headers['user-agent'],
  };
}

export function readRefreshToken(req: Request): string | undefined {
  const raw = req.headers['x-refresh-token'];
  if (typeof raw === 'string' && raw.length > 0) {
    return raw;
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const value = raw[0];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

export function authBodyFromPair(pair: TokenPair): AuthResponseDto {
  return {
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
  };
}
