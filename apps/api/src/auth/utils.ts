import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestMeta } from './interfaces';

export function parseDob(dob?: string): Date | null {
  if (!dob) return null;
  const dateParts = dob.split('-');
  if (dateParts.length !== 3) {
    throw new BadRequestException('dob must be in YYYY-MM-DD format');
  }
  const [yearRaw, monthRaw, dayRaw] = dateParts;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new BadRequestException('dob must be in YYYY-MM-DD format');
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  if (!isValidDate) {
    throw new BadRequestException('dob must be a valid calendar date');
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
