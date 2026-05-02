import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { resolveSeedAsOfDate, yearsBefore } from './seed-date-range';

const PRODUCT_COUNT = Number(process.env.SEED_PRODUCT_COUNT ?? 200);
const SEED_SKU_PREFIX = 'VNMIXX-';

/** Number of picsum placeholders per variant color (front/back/detail… for list + PDP). */
const IMAGES_PER_COLOR_MIN = 3;
const IMAGES_PER_COLOR_MAX = 5;

const COLOR_IMAGE_ANGLE_LABELS = [
  'Mặt trước',
  'Mặt sau',
  'Cận chi tiết',
  'Lookbook',
  'Góc nghiêng',
];

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
  { name: 'Vàng mustard', hexCode: '#E1AD01' },
  { name: 'Cam đất', hexCode: '#CC5500' },
  { name: 'Xanh mint', hexCode: '#98FF98' },
  { name: 'Tím nhạt', hexCode: '#E6E6FA' },
];

const SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'] as const;

function picsumUrl(seed: string, w: number, h: number): string {
  const s = encodeURIComponent(seed).slice(0, 80);
  return `https://picsum.photos/seed/${s}/${w}/${h}`;
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

function buildDescription(name: string): string {
  return `${name}: ${faker.commerce.productDescription()}\n\nĐặc điểm nổi bật:\n- ${faker.lorem.sentence()}\n- ${faker.lorem.sentence()}\n- ${faker.lorem.sentence()}\n\nChất liệu cao cấp mang lại sự thoải mái tối đa cho người mặc. Thiết kế hiện đại, phù hợp với phong cách thời trang trẻ trung và năng động của Việt Nam.`;
}

function generateProductName(categoryName: string): string {
  const adjectives = [
    'Cao cấp',
    'Premium',
    'Essential',
    'Classic',
    'Hiện đại',
    'Basic',
    'Dáng rộng',
    'Slim Fit',
    'Thể thao',
    'Vintage',
    'Hàn Quốc',
    'Trẻ trung',
    'Phong cách',
    'Thanh lịch',
    'Oversize',
    'Unisex',
  ];
  const materials = [
    'Cotton',
    'Linen',
    'Kaki',
    'Denim',
    'Lụa',
    'Nỉ',
    'Len',
    'Da',
    'Thun co giãn',
    'Gấm',
  ];

  const adj = faker.helpers.arrayElement(adjectives);
  const mat = faker.helpers.arrayElement(materials);

  return `${categoryName} ${adj} ${mat} ${faker.string.alphanumeric({ length: 4, casing: 'upper' })}`;
}

function buildProductSlug(name: string, runToken: string, index: number, attempt = 0): string {
  const suffix = attempt > 0 ? `${runToken}-${index + 1}-${attempt}` : `${runToken}-${index + 1}`;
  const normalizedBase = faker.helpers
    .slugify(name)
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const maxBaseLength = 255 - suffix.length - 1;
  const safeBase = normalizedBase.slice(0, Math.max(1, maxBaseLength)).replace(/-$/g, '');
  return `${safeBase}-${suffix}`;
}

export async function seedProducts(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const colorByName = await ensureColors(prisma);
    const sizeByLabel = await ensureSizes(prisma);
    const colorIdToName = new Map<number, string>();
    for (const [name, id] of colorByName) {
      colorIdToName.set(id, name);
    }
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
      throw new Error('Không có danh mục lá. Chạy seed danh mục trước: seedCategories().');
    }

    faker.seed(789);

    let created = 0;
    const batchSize = 100;
    const runToken = Date.now().toString(36);

    const asOf = resolveSeedAsOfDate();
    const rangeStart = yearsBefore(asOf, 3);

    for (let i = 0; i < PRODUCT_COUNT; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, PRODUCT_COUNT);

      await prisma.$transaction(async (tx) => {
        for (let j = i; j < batchEnd; j++) {
          const category = faker.helpers.arrayElement(leafCategories);
          const name = generateProductName(category.name);
          const createdAt = faker.date.between({ from: rangeStart, to: asOf });
          let product: { id: number };
          let slug = '';
          let attempt = 0;

          while (true) {
            slug = buildProductSlug(name, runToken, j, attempt);
            try {
              product = await tx.product.create({
                data: {
                  name,
                  slug,
                  description: buildDescription(name),
                  weight: faker.number.int({ min: 200, max: 1200 }),
                  length: faker.number.int({ min: 20, max: 45 }),
                  width: faker.number.int({ min: 15, max: 35 }),
                  height: faker.number.int({ min: 2, max: 12 }),
                  isActive: faker.datatype.boolean({ probability: 0.9 }),
                  createdAt,
                  updatedAt: createdAt,
                },
                select: { id: true },
              });
              break;
            } catch (error) {
              if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002' &&
                attempt < 5
              ) {
                attempt += 1;
                continue;
              }
              throw error;
            }
          }

          await tx.productCategory.create({
            data: { productId: product.id, categoryId: category.id },
          });

          const numColors = faker.number.int({ min: 1, max: 4 });
          const numSizes = faker.number.int({ min: 2, max: 6 });

          const selectedColors = faker.helpers.arrayElements(colorIds, numColors);
          const selectedSizes = faker.helpers.arrayElements(sizeIds, numSizes);

          const variantStartPrice = faker.helpers.arrayElement([
            99000, 149000, 199000, 249000, 299000, 349000, 399000, 499000, 599000, 799000, 999000,
            1290000, 1590000,
          ]);

          const variantsData: Prisma.ProductVariantCreateManyInput[] = [];
          const imagesData: Prisma.ProductImageCreateManyInput[] = [];

          imagesData.push({
            productId: product.id,
            colorId: null,
            url: picsumUrl(`prod-${product.id}-main`, 800, 1000),
            altText: `${name} - Ảnh chính`,
            sortOrder: 0,
            createdAt,
            updatedAt: createdAt,
          });

          let imgOrder = 1;

          for (const colorId of selectedColors) {
            const colorName = colorIdToName.get(colorId) ?? `#${colorId}`;
            const imagesThisColor = faker.number.int({
              min: IMAGES_PER_COLOR_MIN,
              max: IMAGES_PER_COLOR_MAX,
            });
            for (let imageIndex = 0; imageIndex < imagesThisColor; imageIndex += 1) {
              const angleLabel = COLOR_IMAGE_ANGLE_LABELS[imageIndex] ?? `Ảnh ${imageIndex + 1}`;
              imagesData.push({
                productId: product.id,
                colorId,
                url: picsumUrl(`prod-${product.id}-c${colorId}-i${imageIndex}`, 800, 1000),
                altText: `${name} · ${colorName} · ${angleLabel}`,
                sortOrder: imgOrder,
                createdAt,
                updatedAt: createdAt,
              });
              imgOrder += 1;
            }

            for (const sizeId of selectedSizes) {
              variantsData.push({
                productId: product.id,
                colorId,
                sizeId,
                sku: `${SEED_SKU_PREFIX}${product.id}-C${colorId}-S${sizeId}-${faker.string.alphanumeric(4).toUpperCase()}`,
                price: variantStartPrice + sizeId * 5000,
                onHand: faker.number.int({ min: 0, max: 500 }),
                reserved: faker.number.int({ min: 0, max: 20 }),
                version: 0,
                createdAt,
                updatedAt: createdAt,
              });
            }
          }

          await tx.productVariant.createMany({ data: variantsData });
          await tx.productImage.createMany({ data: imagesData });
          created++;
        }
      });
      console.log(`Created ${created} products...`);
    }

    console.log(`Seed products done: ${created} sản phẩm`);
  } finally {
    await prisma.$disconnect();
  }
}
