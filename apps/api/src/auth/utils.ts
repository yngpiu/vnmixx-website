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

/** Chuyển "DD/MM/YYYY" sang Date object cho database. Trả về null nếu không hợp lệ. */
export function parseDob(dob: string | undefined): Date | null {
  if (!dob) return null;
  const parts = dob.split('/');
  if (parts.length !== 3) return null;
  const day = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10);
  const year = Number.parseInt(parts[2], 10);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
  // Tháng trong JS Date bắt đầu từ 0
  return new Date(year, month - 1, day);
}
