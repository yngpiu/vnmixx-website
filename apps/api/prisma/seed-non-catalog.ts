import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';
import { seedAddresses } from './seed-addresses';
import { seedAuditLogs } from './seed-audit-logs';
import { seedBanners } from './seed-banners';
import { seedCustomers } from './seed-customers';
import { seedEmployees } from './seed-employees';
import { seedInventory } from './seed-inventory';
import { seedLocations } from './seed-locations';
import { seedMedia } from './seed-media';
import { seedOrders } from './seed-orders';
import { seedProductReviews } from './seed-product-reviews';
import { seedRbac } from './seed-rbac';
import { seedSupportChats } from './seed-support-chat';
import { seedWishlists } from './seed-wishlists';

async function assertCatalogExists(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });
  try {
    const [categoryCount, productCount, variantCount] = await Promise.all([
      prisma.category.count({ where: { deletedAt: null, isActive: true } }),
      prisma.product.count({ where: { deletedAt: null, isActive: true } }),
      prisma.productVariant.count({ where: { deletedAt: null, isActive: true } }),
    ]);
    if (categoryCount === 0 || productCount === 0 || variantCount === 0) {
      throw new Error(
        'Thiếu catalog nguồn (categories/products/variants). Hãy import SQL catalog trước khi chạy seed non-catalog.',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

export async function seedNonCatalog(): Promise<void> {
  await assertCatalogExists();
  console.log('--- STARTING NON-CATALOG SEEDING (uses existing SQL/Ivy catalog) ---');
  await seedRbac();
  await seedLocations();
  await seedMedia();
  await seedEmployees();
  await seedCustomers();
  await seedSupportChats();
  await seedAddresses();
  await seedBanners();
  await seedWishlists();
  await seedOrders();
  await seedProductReviews();
  await seedInventory();
  await seedAuditLogs();
  console.log('--- NON-CATALOG SEEDING COMPLETED ---');
}

if (require.main === module) {
  seedNonCatalog().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
