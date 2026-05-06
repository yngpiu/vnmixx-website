import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';
import { CATALOG_SQL_CATEGORY_SEED_ROWS } from './catalog-sql-category-seed';

async function deleteLegacySeedSlugs(prisma: PrismaClient): Promise<void> {
  const legacyPrefix = { slug: { startsWith: 'seed-dm-' as const } };
  await prisma.category.deleteMany({
    where: { AND: [legacyPrefix, { slug: { contains: '-l3-' } }] },
  });
  await prisma.category.deleteMany({
    where: {
      AND: [legacyPrefix, { slug: { contains: '-l2-' } }, { NOT: { slug: { contains: '-l3-' } } }],
    },
  });
  await prisma.category.deleteMany({
    where: {
      AND: [legacyPrefix, { NOT: { slug: { contains: '-l2-' } } }],
    },
  });
}

/**
 * Seeds categories to match `prisma/data/catalog-products-categories-no-banners-20260506-082617.sql`
 * (same slugs and parent links; stable for product import and faker seedProducts).
 */
export async function seedCategories(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });
  try {
    await deleteLegacySeedSlugs(prisma);
    const rows = [...CATALOG_SQL_CATEGORY_SEED_ROWS].sort((a, b) => a.seedOrder - b.seedOrder);
    const slugToId = new Map<string, number>();
    for (const row of rows) {
      const parentId = row.parentSlug === null ? null : slugToId.get(row.parentSlug);
      if (row.parentSlug !== null && parentId === undefined) {
        throw new Error(
          `Parent category slug "${row.parentSlug}" missing before child "${row.slug}".`,
        );
      }
      const cat = await prisma.category.upsert({
        where: { slug: row.slug },
        create: {
          name: row.name,
          slug: row.slug,
          parentId,
          sortOrder: row.sortOrder,
          isFeatured: row.isFeatured,
          showInHeader: row.showInHeader,
          isActive: row.isActive,
        },
        update: {
          name: row.name,
          parentId,
          sortOrder: row.sortOrder,
          isFeatured: row.isFeatured,
          showInHeader: row.showInHeader,
          isActive: row.isActive,
          deletedAt: null,
        },
      });
      slugToId.set(row.slug, cat.id);
    }
    console.log(
      `Seed categories done: ${rows.length} bản ghi (cây trùng catalog SQL dump, upsert theo slug).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
