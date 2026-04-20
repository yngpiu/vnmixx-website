import { BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DEFAULT_REFRESH_EXPIRATION, REFRESH_TOKEN_COOKIE_NAME } from './constants';
import type { AuthResponseDto } from './dto/session.dto';
import type { RequestMeta, TokenPair } from './interfaces';

export function parseDob(dob?: string): Date | null {
  if (!dob) return null;
  const dateParts = dob.split('-');
  if (dateParts.length !== 3) {
    throw new BadRequestException('ngày sinh phải theo định dạng YYYY-MM-DD');
  }
  const [yearRaw, monthRaw, dayRaw] = dateParts;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new BadRequestException('ngày sinh phải theo định dạng YYYY-MM-DD');
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  if (!isValidDate) {
    throw new BadRequestException('ngày sinh phải là một ngày hợp lệ');
  }
  return parsed;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function extractRequestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    deviceInfo: req.headers['user-agent'],
  };
}

function refreshCookieBaseOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict';
  path: string;
} {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite =
    process.env.REFRESH_COOKIE_SAMESITE === 'strict' ? ('strict' as const) : ('lax' as const);
  return {
    httpOnly: true,
    secure: isProd,
    sameSite,
    path: '/',
  };
}

/** Set rotated refresh token; must match path/options used in clear. */
export function setRefreshTokenCookie(res: Response, rawRefreshToken: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, rawRefreshToken, {
    ...refreshCookieBaseOptions(),
    maxAge: DEFAULT_REFRESH_EXPIRATION * 1000,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, refreshCookieBaseOptions());
}

export function readRefreshTokenFromCookie(req: Request): string | undefined {
  const jar = req.cookies as Record<string, string | undefined> | undefined;
  const raw = jar?.[REFRESH_TOKEN_COOKIE_NAME];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

function readRefreshTokenFromHeader(req: Request): string | undefined {
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

export function readRefreshToken(req: Request): string | undefined {
  return readRefreshTokenFromCookie(req) ?? readRefreshTokenFromHeader(req);
}

export function authBodyFromPair(pair: TokenPair): AuthResponseDto {
  return {
    accessToken: pair.accessToken,
    expiresIn: pair.expiresIn,
    refreshToken: pair.refreshToken,
  };
}
