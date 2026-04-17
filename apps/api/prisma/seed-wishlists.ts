import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';

export async function seedWishlists(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.wishlist.deleteMany({});
    console.log('Cleared existing wishlists.');

    const customers = await prisma.customer.findMany({ take: 50 });
    const products = await prisma.product.findMany({ take: 50 });

    if (customers.length === 0 || products.length === 0) {
      console.log('Customers or Products missing.');
      return;
    }

    let created = 0;
    for (const customer of customers) {
      const count = Math.floor(Math.random() * 5) + 1;
      const shuffled = [...products].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);

      for (const product of selected) {
        await prisma.wishlist.create({
          data: {
            customerId: customer.id,
            productId: product.id,
          },
        });
        created += 1;
      }
    }

    console.log(`Seed wishlists done: ${created} items created.`);
  } finally {
    await prisma.$disconnect();
  }
}
