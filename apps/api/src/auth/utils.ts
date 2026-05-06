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

/** Parse ngày sinh theo `YYYY-MM-DD` hoặc fallback `DD/MM/YYYY`. */
export function parseDob(dob: string | undefined): Date | null {
  if (!dob) return null;
  const trimmedDob = dob.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedDob);
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10);
    const month = Number.parseInt(isoMatch[2], 10);
    const day = Number.parseInt(isoMatch[3], 10);
    return new Date(year, month - 1, day);
  }
  const legacyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmedDob);
  if (!legacyMatch) return null;
  const day = Number.parseInt(legacyMatch[1], 10);
  const month = Number.parseInt(legacyMatch[2], 10);
  const year = Number.parseInt(legacyMatch[3], 10);
  return new Date(year, month - 1, day);
}
