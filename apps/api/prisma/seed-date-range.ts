/** Ngày trong một năm (seed), không năm nhuận — đủ cho phân bổ demo. */
export const SEED_DAYS_PER_YEAR = 365;
export const SEED_MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Mốc “hôm nay” cho toàn bộ seed (đồng bộ dashboard / demo).
 * Mặc định: 28/4/2026 cuối ngày +07.
 * Ghi đè: `SEED_AS_OF=2026-04-28` hoặc chuỗi ISO đầy đủ.
 */
export function resolveSeedAsOfDate(): Date {
  const raw = process.env.SEED_AS_OF?.trim();
  if (!raw) {
    return new Date('2026-04-28T23:59:59.999+07:00');
  }
  const short = /^\d{4}-\d{2}-\d{2}$/;
  const parsed = short.test(raw) ? new Date(`${raw}T23:59:59.999+07:00`) : new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`SEED_AS_OF không hợp lệ: "${raw}"`);
  }
  return parsed;
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
