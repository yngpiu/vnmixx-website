import { SEED_CONFIG } from './seed-constants';

/** Ngày trong một năm (seed), không năm nhuận — đủ cho phân bổ demo. */
export const SEED_DAYS_PER_YEAR = 365;
export const SEED_MS_PER_DAY = 24 * 60 * 60 * 1000;

export function resolveSeedAsOfDate(): Date {
  const asOfRaw = process.env.SEED_AS_OF_ISO?.trim() ?? SEED_CONFIG.asOfIso;
  if (asOfRaw.length > 0) {
    const asOf = new Date(asOfRaw);
    if (!Number.isNaN(asOf.getTime())) {
      return asOf;
    }
  }
  return new Date();
}

export function yearsBefore(asOf: Date, years: number): Date {
  const d = new Date(asOf);
  d.setFullYear(d.getFullYear() - years);
  return d;
}

export function clampDate(d: Date, min: Date, max: Date): Date {
  const t = d.getTime();
  const lo = min.getTime();
  const hi = max.getTime();
  if (t < lo) return new Date(lo);
  if (t > hi) return new Date(hi);
  return d;
}

/** Ranh giới 3 phần (20% / 30% / 50%) trong cửa sổ [rangeStart, asOf] — mỗi phần ~365 ngày. */
export function seedWindowThirdBoundaries(rangeStart: Date, asOf: Date): { y1: Date; y2: Date } {
  const y1 = new Date(rangeStart.getTime() + SEED_DAYS_PER_YEAR * SEED_MS_PER_DAY);
  const y2 = new Date(rangeStart.getTime() + 2 * SEED_DAYS_PER_YEAR * SEED_MS_PER_DAY);
  return {
    y1: clampDate(y1, rangeStart, asOf),
    y2: clampDate(y2, rangeStart, asOf),
  };
}
