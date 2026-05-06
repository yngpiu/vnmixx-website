/**
 * Seed Ivy catalog từ JSON xuất bởi `temp/crawl/ivy/scripts/crawl-pilot.ts`.
 *
 * ```bash
 * cd apps/api && node --env-file-if-exists=.env --import tsx prisma/seed-ivy-from-json.ts
 * ```
 *
 * File mặc định (ưu tiên file tồn tại):
 *   1) ivy-catalog.seed-ready.json (full crawl)
 *   2) seed-ready.nu-ao-ao-so-mi.json (pilot)
 * Override: IVY_CATALOG_JSON=/abs/or/rel/path.json
 */
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { type Prisma, PrismaClient } from '../generated/prisma/client';
import {
  neighborHexDistinct,
  semanticHexFromFingerprint,
  unpackHexRgb,
} from './ivy-semantic-color-hex';

const CATEGORY_NAME_MAX = 100;
const CATEGORY_SLUG_MAX = 120;
const PRODUCT_SLUG_DB_MAX = 255;
const PRODUCT_NAME_DB_MAX = 255;
const COLOR_NAME_DB_MAX = 50;
const SIZE_LABEL_DB_MAX = 10;
const VARIANT_SKU_MAX = 50;
const UNIT_DEFAULT = 'pcs';
const IMG_URL_DB_MAX = 500;
const ALT_TEXT_DB_MAX = 255;

type FlatCategorySeed = Readonly<{
  level: 1 | 2 | 3;
  name: string;
  slug: string;
  parentSlug: string | null;
  sortOrder: number;
  isFeatured: boolean;
  showInHeader: boolean;
  isActive: boolean;
  ivyListingUrl?: string | null;
}>;

type IvyColorSeed = Readonly<{
  key: string;
  displayName: string;
  hexCode: string;
  ivyKeys?: readonly string[];
}>;

type IvyVariantSeed = Readonly<{
  ivyProductSubSku: string;
  ivySwatchCode: string;
  colorDisplayName: string;
  colorKey: string;
  sizeLabel: string;
  priceVnd: number;
  compareAtPriceVnd: number | null;
  onHand: number;
  reserved: number;
}>;

type IvyProductSeed = Readonly<{
  categoryLevel3Slugs: readonly string[];
  product: {
    name: string;
    slug: string;
    description: string | null;
    weightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    isActive: boolean;
  };
  imagesGlobal: readonly { url: string; alt: string | null; sortOrder: number }[];
  imagesByColor: Readonly<
    Record<string, readonly { url: string; alt: string | null; sortOrder: number }[]>
  >;
  variants: readonly IvyVariantSeed[];
}>;

type IvySeedFile = Readonly<{
  schemaVersion: number;
  categories: FlatCategorySeed[];
  colors: IvyColorSeed[];
  sizes: string[];
  products: IvyProductSeed[];
}>;

type JsonRecord = Readonly<Record<string, unknown>>;

const SIZE_ORDER_PREF: readonly string[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'FREE SIZE'];

const IVY_JSON_DIR = path.resolve(process.cwd(), '../../temp/crawl/ivy/json');

const DEFAULT_IVY_CATALOG_CANDIDATES = [
  'ivy-catalog.seed-ready.json',
  'seed-ready.nu-ao-ao-so-mi.json',
] as const;

function resolveCatalogJsonPath(): string {
  const fromEnv = process.env.IVY_CATALOG_JSON?.trim();
  if (fromEnv != null && fromEnv.length > 0) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }
  for (const name of DEFAULT_IVY_CATALOG_CANDIDATES) {
    const p = path.join(IVY_JSON_DIR, name);
    if (fs.existsSync(p)) return p;
  }
  return path.join(IVY_JSON_DIR, DEFAULT_IVY_CATALOG_CANDIDATES[0]);
}

function fitDbChars(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen);
}

function normalizeHex(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m)
    return `#${crypto.createHash('sha256').update(hex).digest('hex').slice(0, 6)}`.toUpperCase();
  return `#${m[1].toUpperCase()}`;
}

function normalizeIvyColorNameKey(rawInput: string): string {
  return rawInput.replace(/\s+/g, ' ').trim().normalize('NFC').toLowerCase();
}

const HOATIET_DISPLAY_PREFIX = /^họa tiết\s+/iu;

/**
 * Bỏ tiền tố Ivy "Họa tiết …" để màu nền và màu hoạ tiết map cùng một dòng palette (SKU/ô vẫn khác nhau).
 */
function stripHoatietCatalogPrefix(rawDisplay: string): string {
  const trimmed = rawDisplay.replace(/\s+/g, ' ').trim();
  const cut = trimmed.replace(HOATIET_DISPLAY_PREFIX, '').trim();
  return cut.length > 0 ? cut : trimmed;
}

/**
 * Gộp ô màu catalog theo **nhãn hiển thị Ivy đã chuẩn hóa** (VD `Đỏ mận`, `Đen`, `Trắng`; `Họa tiết Đỏ` ⇒ `Đỏ`): cùng tên ⇒ một dòng `colors`
 * và một `hex` deterministic. Mã ô Ivy (`049` vs `032`) chỉ là nội bộ SKU/ảnh, không ép vào `colors.name`.
 * Sau chuẩn hóa, chỉ báo lỗi khi các ô gộp cùng fingerprint có **tên hiển thị sau khi bỏ tiền tố "Họa tiết"** vẫn khác nhau (trùng tông nhưng khác màu được gộp).
 */
function ivySemanticColorFingerprint(displayRaw: string, colorKeyFallback: string): string {
  let trimmed = displayRaw.replace(/\s+/g, ' ').trim();
  trimmed = stripHoatietCatalogPrefix(trimmed);
  const baseLabel = trimmed.length > 0 ? trimmed : `Màu ${colorKeyFallback.trim()}`;
  return normalizeIvyColorNameKey(baseLabel);
}

/** Tên cột `colors.name`: không lưu tiền tố hoạ tiết (`Họa tiết X` ⇒ `X`); chỉ truncate `VarChar(50)`. */
function colorCatalogDbName(displayRaw: string): string {
  const canon = stripHoatietCatalogPrefix(displayRaw.replace(/\s+/g, ' ').trim());
  const base = canon.length > 0 ? canon : `Màu`;
  return fitDbChars(base, COLOR_NAME_DB_MAX);
}

function pickVariantDisplayRaw(v: IvyVariantSeed): string {
  const t = v.colorDisplayName.replace(/\s+/g, ' ').trim();
  if (t.length > 0) return t;
  return `Màu ${v.colorKey.trim()}`;
}

function sizeSortOrdinal(labelUpper: string): number {
  const idx = SIZE_ORDER_PREF.indexOf(labelUpper);
  return idx >= 0 ? idx : SIZE_ORDER_PREF.length + labelUpper.localeCompare('ZZZ');
}

function skuForVariant(
  rawIvySku: string,
  productSlug: string,
  colorKey: string,
  sizeLabelNorm: string,
): string {
  const raw = rawIvySku.trim();
  if (raw.length <= VARIANT_SKU_MAX) return fitDbChars(raw, VARIANT_SKU_MAX);
  const h = crypto
    .createHash('sha256')
    .update(`${productSlug}|${colorKey}|${sizeLabelNorm}|${raw}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
  const suffixPart = `-H${h}`;
  const availPrefix = VARIANT_SKU_MAX - suffixPart.length;
  let base = raw.slice(0, Math.max(1, availPrefix));
  let out = `${base}${suffixPart}`;
  while (out.length > VARIANT_SKU_MAX) {
    base = base.slice(0, base.length - 1).replace(/-+$/gu, '');
    out = `${base}${suffixPart}`;
    if (base.length < 8) break;
  }
  return fitDbChars(out, VARIANT_SKU_MAX);
}

function normalizeSizeLabelForDb(label: string): string {
  const trimmed = label.trim();
  const u = trimmed.toUpperCase();
  if (u.includes('FREE')) return fitDbChars('Free Size', SIZE_LABEL_DB_MAX);
  if (SIZE_ORDER_PREF.includes(u)) return fitDbChars(u, SIZE_LABEL_DB_MAX);
  return fitDbChars(trimmed, SIZE_LABEL_DB_MAX);
}

function jsonStringField(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  throw new Error('JSON field must be string, number, boolean, or null');
}

function jsonSlugForError(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '(invalid)';
}

function optionalJsonStringOrNull(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  throw new Error('ivyListingUrl must be a string scalar when present');
}

function parseFlatCategoryTreeNode(node: JsonRecord): FlatCategorySeed {
  const level = Number(node.level);
  if (level !== 1 && level !== 2 && level !== 3) {
    throw new Error(`Category level không hợp lệ (slug=${jsonSlugForError(node.slug)})`);
  }
  const ps = node.parentSlug;
  return {
    level: level,
    name: jsonStringField(node.name),
    slug: jsonStringField(node.slug),
    parentSlug: ps == null || ps === '' ? null : jsonStringField(ps),
    sortOrder: Number(node.sortOrder) || 0,
    isFeatured: Boolean(node.isFeatured),
    showInHeader: Boolean(node.showInHeader),
    isActive: node.isActive !== false,
    ivyListingUrl: optionalJsonStringOrNull(node.ivyListingUrl),
  };
}

function collectColorsInfer(
  products: ReadonlyArray<Readonly<{ variants: readonly IvyVariantSeed[] }>>,
): IvyColorSeed[] {
  type Agg = { displayRaw: string; keyRaw: string };
  const byFp = new Map<string, Agg>();
  for (const product of products) {
    for (const v of product.variants) {
      const displayRaw = pickVariantDisplayRaw(v);
      const fp = ivySemanticColorFingerprint(displayRaw, v.colorKey);
      const existing = byFp.get(fp);
      if (!existing) {
        byFp.set(fp, { displayRaw, keyRaw: v.colorKey.trim() });
      } else if (displayRaw.length > existing.displayRaw.length) {
        byFp.set(fp, { displayRaw, keyRaw: v.colorKey.trim() });
      }
    }
  }
  const out: IvyColorSeed[] = [];
  for (const [, agg] of byFp) {
    const kr = agg.keyRaw;
    out.push({
      key: kr,
      displayName: fitDbChars(agg.displayRaw.replace(/\s+/g, ' ').trim(), COLOR_NAME_DB_MAX),
      hexCode: semanticHexFromFingerprint(ivySemanticColorFingerprint(agg.displayRaw, kr)),
      ivyKeys: [kr],
    });
  }
  out.sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
  return out;
}

function collectSizesInfer(
  products: ReadonlyArray<Readonly<{ variants: readonly { sizeLabel: string }[] }>>,
): string[] {
  const s = new Set<string>();
  for (const p of products) for (const v of p.variants) s.add(v.sizeLabel.trim());
  return [...s].sort((a, b) => sizeSortOrdinal(a.toUpperCase()) - sizeSortOrdinal(b.toUpperCase()));
}

/** Một dòng màu catalog: tạo toàn bộ trước khi ingest từng sản phẩm. */
type GlobalColorAgg = Readonly<{
  fingerprint: string;
  displayNameForDb: string;
  hexInput: string | null;
}>;

function ivyColorFingerprintFromSeedRow(c: IvyColorSeed): string {
  const rawDisp = String(c.displayName ?? '').trim();
  const keyPrimary = String(c.key ?? '').trim();
  const spaced = rawDisp.replace(/\s+/g, ' ').trim();
  const label =
    spaced.length > 0
      ? spaced.replace(new RegExp(`\\s+${escapeRegExp(keyPrimary)}$`, 'iu'), '').trim() || spaced
      : `Màu ${keyPrimary}`;
  return ivySemanticColorFingerprint(label, keyPrimary);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertNoConflictingIvyColorKeysPerSemanticLabel(
  products: readonly IvyProductSeed[],
): void {
  for (const p of products) {
    const slug = p.product.slug.trim();
    const buckets = new Map<string, Set<string>>();
    const baseLabelsPerFp = new Map<string, Set<string>>();
    for (const v of p.variants) {
      const pick = pickVariantDisplayRaw(v);
      const labelKey = ivySemanticColorFingerprint(pick, v.colorKey);
      const ky = v.colorKey.trim().toLowerCase();
      let setForLabel = buckets.get(labelKey);
      if (setForLabel == null) {
        setForLabel = new Set<string>();
        buckets.set(labelKey, setForLabel);
      }
      setForLabel.add(ky);
      let baseLabs = baseLabelsPerFp.get(labelKey);
      if (baseLabs == null) {
        baseLabs = new Set<string>();
        baseLabelsPerFp.set(labelKey, baseLabs);
      }
      const rawSpaced = pick.replace(/\s+/g, ' ').trim();
      baseLabs.add(normalizeIvyColorNameKey(stripHoatietCatalogPrefix(rawSpaced)));
    }
    for (const [fp, keys] of buckets) {
      if (keys.size <= 1) continue;
      const baseLabs = baseLabelsPerFp.get(fp);
      if (baseLabs == null || baseLabs.size <= 1) continue;
      throw new Error(
        `Slug "${slug}": Ivy có nhiều mã ô khác nhau (${[...keys].sort().join(', ')}) trong cùng một nhãn gộp "${fp}", ` +
          `nhưng sau khi bỏ "Họa tiết" vẫn còn nhiều tên khác nhau (${[...baseLabs].sort().join(' | ')}). ` +
          'Chỉnh nhãn phía crawl hoặc làm rõ semantic.',
      );
    }
  }
}

function buildGlobalColorAggs(payload: IvySeedFile): GlobalColorAgg[] {
  const map = new Map<string, GlobalColorAgg>();
  const bump = (fp: string, displayRaw: string, hexInput: string | null): void => {
    const dbName = colorCatalogDbName(displayRaw);
    const row = map.get(fp);
    if (!row) {
      map.set(fp, { fingerprint: fp, displayNameForDb: dbName, hexInput });
      return;
    }
    const nextName = dbName.length > row.displayNameForDb.length ? dbName : row.displayNameForDb;
    const nextHex =
      hexInput != null && hexInput.length > 0 && row.hexInput == null ? hexInput : row.hexInput;
    map.set(fp, { fingerprint: fp, displayNameForDb: nextName, hexInput: nextHex });
  };
  for (const c of payload.colors) {
    const rawDisp = String(c.displayName ?? '').trim();
    const keyPrimary = String(c.key ?? '').trim();
    const keySet = new Set<string>();
    if (keyPrimary.length > 0) keySet.add(keyPrimary);
    const extras = Array.isArray(c.ivyKeys) ? c.ivyKeys : [];
    for (const ex of extras) {
      const k = String(ex ?? '').trim();
      if (k.length > 0) keySet.add(k);
    }
    const hexFromRow = String(c.hexCode ?? '').trim().length >= 4 ? String(c.hexCode).trim() : null;
    const fallbackKey =
      keyPrimary ||
      [...keySet].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))[0] ||
      '';
    const label = (rawDisp.length > 0 ? rawDisp : `Màu ${fallbackKey}`).replace(/\s+/g, ' ').trim();
    const fp = ivySemanticColorFingerprint(label, fallbackKey);
    bump(fp, label, hexFromRow);
  }
  for (const p of payload.products) {
    for (const v of p.variants) {
      const raw = pickVariantDisplayRaw(v);
      bump(ivySemanticColorFingerprint(raw, v.colorKey), raw, null);
    }
    const byColor = p.imagesByColor ?? {};
    for (const sw of Object.keys(byColor)) {
      const lc = sw.trim().toLowerCase();
      const matched = p.variants.some((vx) => vx.colorKey.trim().toLowerCase() === lc);
      if (matched) continue;
      const rawImg = `Màu ${sw.trim()}`;
      bump(ivySemanticColorFingerprint(rawImg, sw.trim()), rawImg, null);
    }
  }
  return [...map.values()].sort((a, b) =>
    a.displayNameForDb.localeCompare(b.displayNameForDb, 'vi'),
  );
}

/**
 * Chuẩn hóa cả JSON đầy đủ (schemaVersion + categories) lẫn pilot cũ (categoryAssignment + categories.tree.json).
 */
function coerceIvySeedFile(raw: unknown, jsonPath: string): IvySeedFile {
  const r = raw as JsonRecord & {
    products?: unknown;
    categories?: unknown;
    colors?: unknown;
    sizes?: unknown;
  };
  const productsRaw = r.products;
  if (!Array.isArray(productsRaw) || productsRaw.length === 0) {
    throw new Error(`JSON thiếu products[] không rỗng: ${jsonPath}`);
  }
  if (r.schemaVersion === 1 && Array.isArray(r.categories) && r.categories.length > 0) {
    return r as unknown as IvySeedFile;
  }
  const pilotAssign = r.categoryAssignment as JsonRecord | undefined;
  const level3FromPilot =
    typeof pilotAssign?.level3Slug === 'string' && pilotAssign.level3Slug.trim().length > 0
      ? pilotAssign.level3Slug.trim()
      : null;
  const treePath = path.join(path.dirname(jsonPath), 'categories.tree.json');
  if (!fs.existsSync(treePath)) {
    throw new Error(
      `JSON không có categories nhúng. Cần file categories.tree.json tại ${treePath}, hoặc dùng ivy-catalog.seed-ready.json (tạo bằng crawl: \`pnpm crawl:ivy -- full\` trong apps/api). Hiện tại: ${jsonPath}`,
    );
  }
  const treeParsed = JSON.parse(fs.readFileSync(treePath, 'utf8')) as JsonRecord;
  const treeCats = treeParsed.categories;
  if (!Array.isArray(treeCats)) {
    throw new Error(`categories.tree.json thiếu mảng categories: ${treePath}`);
  }
  const categories = treeCats.map((n) => parseFlatCategoryTreeNode(n as JsonRecord));

  type ProductExt = IvyProductSeed & { categoryLevel3Slugs?: string[] };
  const productsParsed = productsRaw as ProductExt[];

  const colorCandidates =
    Array.isArray(r.colors) && r.colors.length > 0
      ? (r.colors as IvyColorSeed[])
      : collectColorsInfer(productsParsed);
  const colors = colorCandidates.filter(
    (c, idx, arr) =>
      arr.findIndex(
        (x) => ivyColorFingerprintFromSeedRow(x) === ivyColorFingerprintFromSeedRow(c),
      ) === idx,
  );
  const sizes =
    Array.isArray(r.sizes) && r.sizes.length > 0
      ? (r.sizes as unknown[]).map((x) => String(x))
      : collectSizesInfer(productsParsed);

  const products: IvyProductSeed[] = productsParsed.map((p) => {
    const inherited =
      Array.isArray(p.categoryLevel3Slugs) && p.categoryLevel3Slugs.length > 0
        ? [...p.categoryLevel3Slugs]
        : level3FromPilot != null
          ? [level3FromPilot]
          : [];
    return {
      ...p,
      categoryLevel3Slugs: inherited,
      imagesGlobal: p.imagesGlobal ?? [],
      imagesByColor: p.imagesByColor ?? {},
    };
  });
  const noL3 = products.filter((p) => p.categoryLevel3Slugs.length === 0);
  if (noL3.length > 0) {
    throw new Error(
      `${noL3.length} sản phẩm không có categoryLevel3 và JSON không có categoryAssignment.level3Slug — không thể tạo product_categories.`,
    );
  }

  return { schemaVersion: 1, categories, colors, sizes, products };
}

export async function seedIvyFromJson(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (apps/api/.env).');
  }
  const jsonPath = resolveCatalogJsonPath();
  if (!fs.existsSync(jsonPath)) {
    const tried = [
      process.env.IVY_CATALOG_JSON?.trim() ?? null,
      ...DEFAULT_IVY_CATALOG_CANDIDATES.map((n) => path.join(IVY_JSON_DIR, n)),
    ]
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
      .map((p) => (path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)));
    const unique = [...new Set(tried)];
    throw new Error(
      `Không tìm thấy Ivy JSON. Đặt IVY_CATALOG_JSON hoặc tạo một trong: ${unique.join(' | ')}`,
    );
  }
  const parsed: unknown = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const payload = coerceIvySeedFile(parsed, jsonPath);

  assertNoConflictingIvyColorKeysPerSemanticLabel(payload.products);

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const sortedCats = [...payload.categories].sort(
      (a, b) => a.level - b.level || a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug),
    );
    const slugToId = new Map<string, number>();
    for (const c of sortedCats) {
      const parentId = c.parentSlug == null ? null : slugToId.get(c.parentSlug);
      if (c.parentSlug != null && parentId == null) {
        throw new Error(`Category orphan: không tìm slug cha '${c.parentSlug}' cho '${c.slug}'`);
      }
      const slugFit = fitDbChars(c.slug, CATEGORY_SLUG_MAX);
      await prisma.category.upsert({
        where: { slug: slugFit },
        create: {
          name: fitDbChars(c.name, CATEGORY_NAME_MAX),
          slug: slugFit,
          isFeatured: c.isFeatured,
          showInHeader: c.showInHeader,
          isActive: c.isActive,
          sortOrder: c.sortOrder,
          parentId,
        },
        update: {
          name: fitDbChars(c.name, CATEGORY_NAME_MAX),
          isFeatured: c.isFeatured,
          showInHeader: c.showInHeader,
          isActive: c.isActive,
          sortOrder: c.sortOrder,
          parentId,
          deletedAt: null,
        },
      });
      const row = await prisma.category.findUniqueOrThrow({
        where: { slug: slugFit },
        select: { id: true },
      });
      slugToId.set(c.slug, row.id);
    }

    const paletteRows = buildGlobalColorAggs(payload);
    const colorIdByFingerprint = new Map<string, number>();

    console.log(`Ivy seed: ${paletteRows.length} màu chung catalog (ghi DB trước sản phẩm).`);

    for (const row of paletteRows) {
      const nm = row.displayNameForDb;
      const semanticFallbackHex = semanticHexFromFingerprint(row.fingerprint);
      let hexResolved = normalizeHex(row.hexInput ?? semanticFallbackHex);
      const anchorRgb = unpackHexRgb(semanticFallbackHex);
      for (let attempt = 0; attempt < 16; attempt += 1) {
        const clash = await prisma.color.findFirst({
          where: { hexCode: hexResolved, NOT: { name: nm } },
        });
        if (clash == null) break;
        hexResolved = normalizeHex(neighborHexDistinct(anchorRgb, attempt * 9973 + nm.length));
      }
      const upsertColor = await prisma.color.upsert({
        where: { name: nm },
        create: { name: nm, hexCode: hexResolved },
        update: { hexCode: hexResolved },
        select: { id: true },
      });
      colorIdByFingerprint.set(row.fingerprint, upsertColor.id);
    }

    const rawSizeLabels = [...new Set(payload.sizes.map((s) => s.trim()).filter(Boolean))];
    rawSizeLabels.sort(
      (a, b) => sizeSortOrdinal(a.toUpperCase()) - sizeSortOrdinal(b.toUpperCase()),
    );
    const labelToSizeId = new Map<string, number>();
    for (let ix = 0; ix < rawSizeLabels.length; ix += 1) {
      const lbl = rawSizeLabels[ix];
      const norm = normalizeSizeLabelForDb(lbl);
      const row = await prisma.size.upsert({
        where: { label: norm },
        create: { label: norm, sortOrder: ix },
        update: { sortOrder: ix },
        select: { id: true, label: true },
      });
      labelToSizeId.set(lbl.toLowerCase(), row.id);
      labelToSizeId.set(lbl.trim(), row.id);
      labelToSizeId.set(norm, row.id);
      labelToSizeId.set(norm.toLowerCase(), row.id);
      labelToSizeId.set(norm.toUpperCase(), row.id);
    }

    const total = payload.products.length;
    for (let pi = 0; pi < total; pi += 1) {
      const ivy = payload.products[pi];
      await ingestOneProduct({
        prisma,
        slugToId,
        labelToSizeId,
        colorIdByFingerprint,
        ivyProduct: ivy,
      });
      if ((pi + 1) % 25 === 0 || pi === total - 1) {
        console.log(`Ivy seed: ${pi + 1}/${total}`);
      }
    }

    console.log(`Ivy seed hoàn thành: ${total} sản phẩm (${jsonPath})`);
  } finally {
    await prisma.$disconnect();
  }
}

async function ingestOneProduct(input: {
  prisma: PrismaClient;
  slugToId: Map<string, number>;
  labelToSizeId: Map<string, number>;
  colorIdByFingerprint: Map<string, number>;
  ivyProduct: IvyProductSeed;
}): Promise<void> {
  const { prisma, slugToId, labelToSizeId, colorIdByFingerprint, ivyProduct } = input;

  const slugFit = fitDbChars(ivyProduct.product.slug.trim(), PRODUCT_SLUG_DB_MAX);
  const createBody: Prisma.ProductUpsertArgs['create'] = {
    name: fitDbChars(ivyProduct.product.name.trim(), PRODUCT_NAME_DB_MAX),
    slug: slugFit,
    description: ivyProduct.product.description,
    weight: ivyProduct.product.weightGrams,
    length: ivyProduct.product.lengthCm,
    width: ivyProduct.product.widthCm,
    height: ivyProduct.product.heightCm,
    isActive: ivyProduct.product.isActive,
  };

  const productRow = await prisma.product.upsert({
    where: { slug: slugFit },
    create: createBody,
    update: {
      name: createBody.name,
      description: createBody.description,
      weight: createBody.weight,
      length: createBody.length,
      width: createBody.width,
      height: createBody.height,
      isActive: createBody.isActive,
      deletedAt: null,
    },
  });

  await prisma.productCategory.deleteMany({ where: { productId: productRow.id } });
  const junctionRows = ivyProduct.categoryLevel3Slugs
    .map((sl) => {
      const categoryId = slugToId.get(sl);
      return categoryId == null ? null : { productId: productRow.id, categoryId };
    })
    .filter((x): x is { productId: number; categoryId: number } => x !== null);

  await prisma.productCategory.createMany({
    data: junctionRows,
    skipDuplicates: true,
  });

  await prisma.productVariant.deleteMany({ where: { productId: productRow.id } });
  await prisma.productImage.deleteMany({ where: { productId: productRow.id } });

  const skuUsed = new Set<string>();
  type Agg = Readonly<{
    colorId: number;
    sizeId: number;
    sizeNormDb: string;
    onHand: number;
    reserved: number;
    priceVnd: number;
    compareAt: number | null;
    skuSeed: string;
    colorKeySeed: string;
  }>;
  const variantAggByCombo = new Map<string, Agg>();
  for (const v of ivyProduct.variants) {
    const fp = ivySemanticColorFingerprint(pickVariantDisplayRaw(v), v.colorKey);
    const colorId = colorIdByFingerprint.get(fp);
    const sizeNormDb = normalizeSizeLabelForDb(v.sizeLabel);
    const sizeLookup =
      labelToSizeId.get(v.sizeLabel.trim()) ??
      labelToSizeId.get(v.sizeLabel.trim().toLowerCase()) ??
      labelToSizeId.get(sizeNormDb) ??
      labelToSizeId.get(sizeNormDb.toUpperCase());
    const sizeId = sizeLookup ?? null;
    if (colorId == null || sizeId == null) continue;
    const comboKey = `${colorId}:${sizeId}`;
    const q = Math.max(0, v.onHand);
    const rv = Math.max(0, v.reserved ?? 0);
    const existingAgg = variantAggByCombo.get(comboKey);
    if (existingAgg == null) {
      variantAggByCombo.set(comboKey, {
        colorId,
        sizeId,
        sizeNormDb,
        onHand: q,
        reserved: rv,
        priceVnd: v.priceVnd,
        compareAt: v.compareAtPriceVnd,
        skuSeed: v.ivyProductSubSku.trim(),
        colorKeySeed: v.colorKey.trim(),
      });
      continue;
    }
    const cmp = v.compareAtPriceVnd;
    let nextCmp = existingAgg.compareAt;
    if (cmp != null && (nextCmp == null || cmp > nextCmp)) nextCmp = cmp;
    variantAggByCombo.set(comboKey, {
      ...existingAgg,
      onHand: existingAgg.onHand + q,
      reserved: existingAgg.reserved + rv,
      compareAt: nextCmp,
    });
  }

  const variantsOut: Prisma.ProductVariantUncheckedCreateInput[] = [];
  for (const agg of variantAggByCombo.values()) {
    let skuCandidate = skuForVariant(agg.skuSeed, slugFit, agg.colorKeySeed, agg.sizeNormDb);
    let bump = 0;
    while (skuUsed.has(skuCandidate) && bump < 20) {
      bump += 1;
      skuCandidate = skuForVariant(
        `${agg.skuSeed}-d${bump}`,
        slugFit,
        agg.colorKeySeed,
        agg.sizeNormDb,
      );
    }
    if (skuUsed.has(skuCandidate)) continue;
    skuUsed.add(skuCandidate);
    variantsOut.push({
      productId: productRow.id,
      colorId: agg.colorId,
      sizeId: agg.sizeId,
      sku: skuCandidate,
      barcode: null,
      unit: UNIT_DEFAULT,
      price: agg.priceVnd,
      compareAtPrice: agg.compareAt,
      onHand: agg.onHand,
      reserved: agg.reserved,
      version: 0,
      isActive: true,
    });
  }

  if (variantsOut.length > 0) {
    await prisma.productVariant.createMany({ data: variantsOut });
  }

  let sortIdx = 0;
  const imageRows: Prisma.ProductImageUncheckedCreateInput[] = [];
  for (const im of ivyProduct.imagesGlobal) {
    imageRows.push({
      productId: productRow.id,
      colorId: null,
      url: fitDbChars(im.url, IMG_URL_DB_MAX),
      altText: im.alt == null ? null : fitDbChars(im.alt, ALT_TEXT_DB_MAX),
      sortOrder: sortIdx,
    });
    sortIdx += 1;
  }

  Object.entries(ivyProduct.imagesByColor).forEach(([swatchKeyLc, imgs]) => {
    const matchVariant = ivyProduct.variants.find(
      (vx) => vx.colorKey.trim().toLowerCase() === swatchKeyLc.trim().toLowerCase(),
    );
    const labelRaw =
      matchVariant != null ? pickVariantDisplayRaw(matchVariant) : `Màu ${swatchKeyLc.trim()}`;
    const colorIdResolved = colorIdByFingerprint.get(
      ivySemanticColorFingerprint(labelRaw, swatchKeyLc.trim()),
    );
    if (colorIdResolved == null) return;
    for (const im of imgs) {
      imageRows.push({
        productId: productRow.id,
        colorId: colorIdResolved,
        url: fitDbChars(im.url, IMG_URL_DB_MAX),
        altText: im.alt == null ? null : fitDbChars(im.alt, ALT_TEXT_DB_MAX),
        sortOrder: sortIdx,
      });
      sortIdx += 1;
    }
  });

  if (imageRows.length > 0) {
    await prisma.productImage.createMany({ data: imageRows });
  }
}

void seedIvyFromJson().catch((e: unknown): void => {
  console.error(e);
  process.exitCode = 1;
});
