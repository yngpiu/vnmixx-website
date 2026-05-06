import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

type SeedBannerInput = {
  placement: 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP';
  title: string;
  imageUrl: string;
  categoryId: number;
  sortOrder: number;
};

/** Leaf slugs from `catalog-products-categories-no-banners-20260506-082617.sql` (stable banner targets). */
const BANNER_LEAF_SLUGS = [
  'chan-vay-chu-A',
  'ao-thun-nu',
  'quan-jean-nam',
  'dam',
  'ao-so-mi-nam',
] as const;

async function resolveBannerCategoryIds(prisma: PrismaClient): Promise<number[]> {
  const rows = await prisma.category.findMany({
    where: {
      slug: { in: [...BANNER_LEAF_SLUGS] },
      deletedAt: null,
      isActive: true,
    },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r.id] as const));
  const ids: number[] = [];
  for (const slug of BANNER_LEAF_SLUGS) {
    const id = bySlug.get(slug);
    if (id === undefined) {
      throw new Error(
        `Thiếu category slug="${slug}". Chạy seedCategories() hoặc import catalog SQL.`,
      );
    }
    ids.push(id);
  }
  return ids;
}

export async function seedBanners(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });
  try {
    const leafCategoryIds = await resolveBannerCategoryIds(prisma);
    const seedRows: SeedBannerInput[] = [
      {
        placement: 'HERO_SLIDER',
        title: 'Summer Drop 2026',
        imageUrl: 'https://picsum.photos/seed/banner-hero-1/1600/900',
        categoryId: leafCategoryIds[0],
        sortOrder: 0,
      },
      {
        placement: 'HERO_SLIDER',
        title: 'Daily Essentials',
        imageUrl: 'https://picsum.photos/seed/banner-hero-2/1600/900',
        categoryId: leafCategoryIds[1],
        sortOrder: 1,
      },
      {
        placement: 'FEATURED_TILE',
        title: 'Best Seller Picks',
        imageUrl: 'https://picsum.photos/seed/banner-tile-1/1200/1200',
        categoryId: leafCategoryIds[2],
        sortOrder: 0,
      },
      {
        placement: 'FEATURED_TILE',
        title: 'New Arrivals',
        imageUrl: 'https://picsum.photos/seed/banner-tile-2/1200/1200',
        categoryId: leafCategoryIds[3],
        sortOrder: 1,
      },
      {
        placement: 'PROMO_STRIP',
        title: 'Mid Season Offer',
        imageUrl: 'https://picsum.photos/seed/banner-promo-1/1600/900',
        categoryId: leafCategoryIds[4],
        sortOrder: 0,
      },
    ];
    for (const row of seedRows) {
      const existing = await prisma.banner.findFirst({
        where: {
          placement: row.placement,
          title: row.title,
          categoryId: row.categoryId,
        },
        select: { id: true },
      });
      if (existing) {
        await prisma.banner.update({
          where: { id: existing.id },
          data: {
            imageUrl: row.imageUrl,
            sortOrder: row.sortOrder,
            isActive: true,
          },
        });
        continue;
      }
      await prisma.banner.create({
        data: {
          placement: row.placement,
          title: row.title,
          imageUrl: row.imageUrl,
          categoryId: row.categoryId,
          sortOrder: row.sortOrder,
          isActive: true,
        },
      });
    }
    console.log('Seed banners done: HERO_SLIDER(16:9), FEATURED_TILE(1:1), PROMO_STRIP(16:9).');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedBanners().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
