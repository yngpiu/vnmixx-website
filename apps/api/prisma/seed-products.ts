import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';

const PRODUCT_COUNT = 100;

/** SKU prefix — xóa lại seed an toàn hơn khi DB dev chưa có đơn hàng gắn biến thể này. */
const SEED_SKU_PREFIX = 'SEED-';

/** Slug prefix — khớp regex API: chữ thường, số, gạch nối. */
const SEED_SLUG_PREFIX = 'seed-sp-';

const COLORS: { name: string; hexCode: string }[] = [
  { name: 'Đen', hexCode: '#1A1A1A' },
  { name: 'Trắng', hexCode: '#FAFAFA' },
  { name: 'Xám nhạt', hexCode: '#C8C8C8' },
  { name: 'Be / Kem', hexCode: '#E8DCC4' },
  { name: 'Navy', hexCode: '#2B3A55' },
  { name: 'Đỏ đô', hexCode: '#9B2335' },
  { name: 'Xanh lá', hexCode: '#2D6A4F' },
  { name: 'Xanh denim', hexCode: '#4A6FA5' },
  { name: 'Hồng pastel', hexCode: '#F4C2C2' },
  { name: 'Nâu đất', hexCode: '#6B4423' },
];

const SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

/** Tên sản phẩm tiếng Việt — xoay bộ mẫu để ra ~100 tên khác nhau, giới hạn 255 ký tự. */
const PRODUCT_TEMPLATES: string[] = [
  'Áo thun nam cổ tròn cotton',
  'Áo thun nam cổ bẻ polo pique',
  'Áo thun nam tay dài layer mùa lạnh',
  'Áo sơ mi nam công sở dài tay',
  'Áo sơ mi nam kẻ caro slim',
  'Áo sơ mi linen nam đi biển',
  'Quần jean nam slim fit cạp vừa',
  'Quần jean nam ống suông vintage',
  'Quần tây nam công sở không ly',
  'Quần kaki nam lửng summer',
  'Áo thun nữ cổ tròn basic',
  'Áo tank top nữ tập gym',
  'Áo crop top nữ phối layer',
  'Blouse nữ cổ bèo công sở',
  'Sơ mi nữ oversize street',
  'Quần jean nữ cạp cao tôn dáng',
  'Quần short jean nữ lưng cao',
  'Quần culottes nữ linen',
  'Đầm maxi nữ dạo phố',
  'Đầm body tiệc tối',
  'Chân váy chữ A nữ công sở',
  'Chân váy bút chì nữ midi',
  'Áo khoác gió nam chống nước',
  'Áo hoodie nữ unisex nỉ bông',
  'Áo cardigan len mỏng',
  'Áo phao ngắn ấm đông',
  'Blazer nữ phối đồ công sở',
  'Bộ đồ mặc nhà cotton',
  'Pijama satin ngủ ngon',
  'Boxer nam cotton co giãn',
  'Áo bra thể thao nữ medium support',
  'Sneaker nam trắng daily',
  'Sneaker chunky nữ phối đồ',
  'Giày lười nam da lộn',
  'Sandals nữ quai mảnh',
  'Túi tote canvas đi làm',
  'Túi đeo chéo mini da PU',
  'Balo laptop chống sốc',
  'Mũ lưỡi trai cotton',
  'Thắt lưng da nam khóa kim',
  'Áo thun gym nam dry-fit',
  'Legging tập nữ cạp cao',
  'Quần jogger nỉ nam street',
  'Vest nam ba mảnh tiệc',
  'Áo flannel oversize caro',
  'Quần cargo nam túi hộp',
  'Áo khoác jean classic',
  'Jean wide leg nữ retro',
  'Set áo quần bé trai hè',
  'Váy xòe bé gái đi học',
  'Áo len cổ lọ nam giữ ấm',
];

const ADJECTIVES = [
  'Premium',
  'Essential',
  'Signature',
  'Urban',
  'Classic',
  'Athletic',
  'Minimal',
  'Heritage',
];

function buildProductName(index: number): string {
  const base = PRODUCT_TEMPLATES[index % PRODUCT_TEMPLATES.length];
  const adj = ADJECTIVES[Math.floor(index / PRODUCT_TEMPLATES.length) % ADJECTIVES.length];
  const line = Math.floor(index / (PRODUCT_TEMPLATES.length * ADJECTIVES.length)) + 1;
  const name = `${base} ${adj} — BST ${line}`;
  return name.length > 255 ? name.slice(0, 252) + '…' : name;
}

function buildDescription(name: string): string {
  return (
    `${name}: hàng demo seed cho shop thời trang. Chất liệu và màu sắc đa dạng, ` +
    'form chuẩn mặc hằng ngày. Giá và tồn kho chỉ phục vụ môi trường dev / staging.'
  ).slice(0, 5000);
}

function picsumUrl(seed: string, w: number, h: number): string {
  const s = encodeURIComponent(seed).slice(0, 80);
  return `https://picsum.photos/seed/${s}/${w}/${h}`;
}

function trunc(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/** 3–5 biến thể, tổ hợp màu + size không trùng (unique theo schema). */
function pickVariantPairs(
  colorIds: number[],
  sizeIds: number[],
  index: number,
): { colorId: number; sizeId: number }[] {
  const target = 3 + (index % 3);
  const out: { colorId: number; sizeId: number }[] = [];
  let t = 0;
  while (out.length < target && t < 80) {
    const colorId = colorIds[(index + t) % colorIds.length];
    const sizeId = sizeIds[(index + 2 * t) % sizeIds.length];
    const key = `${colorId}-${sizeId}`;
    if (!out.some((p) => `${p.colorId}-${p.sizeId}` === key)) {
      out.push({ colorId, sizeId });
    }
    t += 1;
  }
  if (out.length === 0) {
    out.push({ colorId: colorIds[0], sizeId: sizeIds[0] });
  }
  return out;
}

async function ensureColors(prisma: PrismaClient): Promise<Map<string, number>> {
  const byName = new Map<string, number>();
  for (const c of COLORS) {
    const row = await prisma.color.upsert({
      where: { name: c.name },
      create: { name: c.name, hexCode: c.hexCode },
      update: { hexCode: c.hexCode },
      select: { id: true, name: true },
    });
    byName.set(row.name, row.id);
  }
  return byName;
}

async function ensureSizes(prisma: PrismaClient): Promise<Map<string, number>> {
  const byLabel = new Map<string, number>();
  for (let i = 0; i < SIZE_LABELS.length; i += 1) {
    const label = SIZE_LABELS[i];
    const row = await prisma.size.upsert({
      where: { label },
      create: { label, sortOrder: i },
      update: { sortOrder: i },
      select: { id: true, label: true },
    });
    byLabel.set(row.label, row.id);
  }
  return byLabel;
}

function isPrismaMissingTable(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2021'
  );
}

/** Bỏ qua P2021 (bảng chưa tồn tại) để seed chạy được trên DB dev chưa migrate hết. */
async function deleteManyIgnoreMissingTable(
  run: () => ReturnType<PrismaClient['stockMovement']['deleteMany']>,
): Promise<void> {
  try {
    await run();
  } catch (err) {
    if (isPrismaMissingTable(err)) {
      return;
    }
    throw err;
  }
}

async function wipeSeedProducts(prisma: PrismaClient): Promise<void> {
  const variants = await prisma.productVariant.findMany({
    where: { sku: { startsWith: SEED_SKU_PREFIX } },
    select: { id: true, productId: true },
  });
  if (variants.length === 0) {
    await prisma.product.deleteMany({ where: { slug: { startsWith: SEED_SLUG_PREFIX } } });
    return;
  }
  const variantIds = variants.map((v) => v.id);
  const productIds = [...new Set(variants.map((v) => v.productId))];

  await deleteManyIgnoreMissingTable(() =>
    prisma.stockMovement.deleteMany({ where: { variantId: { in: variantIds } } }),
  );
  await deleteManyIgnoreMissingTable(() =>
    prisma.cartItem.deleteMany({ where: { variantId: { in: variantIds } } }),
  );
  await deleteManyIgnoreMissingTable(() =>
    prisma.orderItem.deleteMany({ where: { variantId: { in: variantIds } } }),
  );

  await prisma.productVariant.deleteMany({ where: { id: { in: variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SEED_SLUG_PREFIX } } });
}

export async function seedProducts(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    await wipeSeedProducts(prisma);

    const colorByName = await ensureColors(prisma);
    const sizeByLabel = await ensureSizes(prisma);
    const colorIds = COLORS.map((c) => colorByName.get(c.name)).filter(
      (id): id is number => id != null,
    );
    const sizeIds = SIZE_LABELS.map((l) => sizeByLabel.get(l)).filter(
      (id): id is number => id != null,
    );

    const leafCategories = await prisma.category.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        children: { none: { deletedAt: null } },
      },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });

    if (leafCategories.length === 0) {
      throw new Error(
        'Không có danh mục lá (isActive, không con). Chạy seed danh mục trước: seedCategories().',
      );
    }

    let created = 0;
    for (let i = 0; i < PRODUCT_COUNT; i += 1) {
      const slug = `${SEED_SLUG_PREFIX}${String(i + 1).padStart(3, '0')}`;
      const name = buildProductName(i);
      const category = leafCategories[i % leafCategories.length];
      const pairs = pickVariantPairs(colorIds, sizeIds, i);
      const basePrice = 159_000 + ((i * 17_389) % 890_000);
      const isActive = i % 11 !== 0;

      const variants = pairs.map((p, vi) => {
        const sku =
          `${SEED_SKU_PREFIX}${String(i + 1).padStart(3, '0')}-C${p.colorId}S${p.sizeId}-V${vi + 1}`.slice(
            0,
            50,
          );
        const price = basePrice + vi * 10_000;
        const onHand = 8 + (((i + vi) * 23) % 220);
        return {
          colorId: p.colorId,
          sizeId: p.sizeId,
          sku,
          price,
          onHand,
        };
      });

      const thumbSeed = `vnmixx-sp-${i}`;
      const imgSeedA = `vnmixx-sp-${i}-a`;
      const imgSeedB = `vnmixx-sp-${i}-b`;

      await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            name,
            slug,
            description: buildDescription(name),
            thumbnail: picsumUrl(thumbSeed, 480, 600),
            categoryId: category.id,
            isActive,
            weight: 220 + ((i * 37) % 400),
            length: 28 + (i % 15),
            width: 22 + (i % 12),
            height: 3 + (i % 8),
          },
        });

        await tx.productCategory.create({
          data: { productId: product.id, categoryId: category.id },
        });

        await tx.productVariant.createMany({
          data: variants.map((v) => ({
            productId: product.id,
            colorId: v.colorId,
            sizeId: v.sizeId,
            sku: v.sku,
            price: v.price,
            onHand: v.onHand,
            reserved: 0,
            version: 0,
          })),
        });

        await tx.productImage.createMany({
          data: [
            {
              productId: product.id,
              colorId: null,
              url: picsumUrl(imgSeedA, 800, 1000),
              altText: trunc(`${name} — ảnh 1`, 255),
              sortOrder: 0,
            },
            {
              productId: product.id,
              colorId: variants[0]?.colorId ?? null,
              url: picsumUrl(imgSeedB, 800, 1000),
              altText: trunc(`${name} — ảnh 2`, 255),
              sortOrder: 1,
            },
          ],
        });
      });

      created += 1;
    }

    console.log(
      `Seed products done: ${created} sản phẩm (slug ${SEED_SLUG_PREFIX}001–${SEED_SLUG_PREFIX}${String(PRODUCT_COUNT).padStart(3, '0')}), biến thể SKU ${SEED_SKU_PREFIX}*.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
