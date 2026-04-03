import { ConfigService } from '@nestjs/config';

export function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

export function getPositiveIntConfig(config: ConfigService, key: string, fallback: number): number {
  const rawValue = config.get<string | number | undefined>(key);
  const parsed = Number(rawValue);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return fallback;
}
