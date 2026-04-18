import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import { Prisma, PrismaClient } from '../generated/prisma/client';

const WISHLIST_COUNT = 15000;

export async function seedWishlists(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.wishlist.deleteMany({});
    console.log('Cleared existing wishlists.');

    const customers = await prisma.customer.findMany({ select: { id: true } });
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (customers.length === 0 || products.length === 0) {
      console.log('Customers or Products missing.');
      return;
    }

    faker.seed(888);

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const wishlistsToCreate: Prisma.WishlistCreateManyInput[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < WISHLIST_COUNT; i++) {
      const customer = faker.helpers.arrayElement(customers);
      const product = faker.helpers.arrayElement(products);
      const key = `${customer.id}-${product.id}`;

      if (!seen.has(key)) {
        seen.add(key);
        const createdAt = faker.date.between({ from: twoYearsAgo, to: new Date() });
        wishlistsToCreate.push({
          customerId: customer.id,
          productId: product.id,
          createdAt,
        });
      }
    }

    wishlistsToCreate.sort(
      (a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime(),
    );

    let created = 0;
    const BATCH_SIZE = 2000;
    for (let i = 0; i < wishlistsToCreate.length; i += BATCH_SIZE) {
      const batch = wishlistsToCreate.slice(i, i + BATCH_SIZE);
      await prisma.wishlist.createMany({ data: batch });
      created += batch.length;
    }

    console.log(`Seed wishlists done: ${created} items created.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedWishlists().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
