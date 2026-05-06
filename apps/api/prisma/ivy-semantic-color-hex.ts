import * as crypto from 'crypto';

/** Deterministic `#RRGGBB` derived from semantic fingerprint label (normalized string). */
export function semanticHexFromFingerprint(fingerprint: string): string {
  const normalized = fingerprint.normalize('NFC').trim().toLowerCase();
  const digest = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  return `#${digest.slice(0, 6).toUpperCase()}`;
}

export type RgbTriple = Readonly<{ r: number; g: number; b: number }>;

/** Parse `#RGB`/`#RRGGBB` (with optional leading `#`) into 8-bit RGB components. */
export function unpackHexRgb(hex: string): RgbTriple {
  const trimmed = hex.trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);
  if (!m) {
    throw new Error(`Invalid hex color "${hex}"`);
  }
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Near-neighbour hex (`#RRGGBB`), deterministic from `(rgb, salt)` for clash resolution. */
export function neighborHexDistinct(rgb: RgbTriple, salt: number): string {
  const h = crypto
    .createHash('sha256')
    .update(`${rgb.r}|${rgb.g}|${rgb.b}|${salt}`, 'utf8')
    .digest('hex');
  const dr = Number.parseInt(h.slice(0, 2), 16) - 128;
  const dg = Number.parseInt(h.slice(2, 4), 16) - 128;
  const db = Number.parseInt(h.slice(4, 6), 16) - 128;
  const clampChannel = (c: number): number => Math.max(0, Math.min(255, c));
  const rr = clampChannel(rgb.r + (dr >> 3));
  const rg = clampChannel(rgb.g + (dg >> 3));
  const rb = clampChannel(rgb.b + (db >> 3));
  return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb
    .toString(16)
    .padStart(2, '0')}`.toUpperCase();
}
