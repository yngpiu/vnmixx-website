import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import { Prisma, PrismaClient } from '../generated/prisma/client';

const VISIT_COUNT = 50000;

const BROWSERS = ['Chrome 124', 'Chrome 123', 'Safari 17', 'Firefox 124', 'Edge 123', 'Opera'];
const REFERRERS = [
  'https://google.com',
  'https://facebook.com',
  'https://zalo.me',
  'https://tiktok.com',
  'https://instagram.com',
  'https://coccoc.com',
  null,
  null,
  null,
];

export async function seedPageVisits(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    try {
      await prisma.pageVisit.deleteMany({});
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2021'
      ) {
        console.log('Skip seedPageVisits: bảng page_visits chưa tồn tại.');
        return;
      }
      throw error;
    }

    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    const products = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      select: { slug: true },
      take: 200,
    });

    const categories = await prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      select: { slug: true },
      take: 20,
    });

    const basePaths = ['/', '/cart', '/checkout', '/about', '/contact', '/profile', '/wishlist'];
    const paths = [...basePaths];
    products.forEach((p) => paths.push(`/products/${p.slug}`));
    categories.forEach((c) => paths.push(`/category/${c.slug}`));

    faker.seed(555);

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    console.log(`Seeding ${VISIT_COUNT} page visits...`);

    const visitsData: Prisma.PageVisitCreateManyInput[] = [];
    for (let i = 0; i < VISIT_COUNT; i += 1) {
      // Generate realistic timestamp distribution
      let createdAt: Date;
      const r = faker.number.float({ min: 0, max: 1 });
      if (r < 0.2) {
        createdAt = faker.date.between({
          from: twoYearsAgo,
          to: new Date(twoYearsAgo.getTime() + 365 * 24 * 60 * 60 * 1000),
        });
      } else if (r < 0.5) {
        createdAt = faker.date.between({
          from: new Date(twoYearsAgo.getTime() + 365 * 24 * 60 * 60 * 1000),
          to: new Date(twoYearsAgo.getTime() + 547 * 24 * 60 * 60 * 1000),
        });
      } else {
        createdAt = faker.date.between({
          from: new Date(twoYearsAgo.getTime() + 547 * 24 * 60 * 60 * 1000),
          to: new Date(),
        });
      }

      if (faker.datatype.boolean({ probability: 0.3 })) {
        const peakMonth = faker.helpers.arrayElement([0, 1, 10, 11]);
        createdAt.setMonth(peakMonth);
      }

      const customer =
        customers.length > 0 && faker.datatype.boolean({ probability: 0.35 })
          ? faker.helpers.arrayElement(customers)
          : null;
      const device = faker.helpers.weightedArrayElement([
        { weight: 60, value: 'mobile' as const },
        { weight: 35, value: 'desktop' as const },
        { weight: 5, value: 'tablet' as const },
      ]);

      let osOptions: string[] = [];
      if (device === 'mobile' || device === 'tablet') {
        osOptions = ['Android 14', 'Android 13', 'iOS 18', 'iOS 17'];
      } else {
        osOptions = ['Windows 11', 'Windows 10', 'macOS 14', 'Ubuntu'];
      }
      const os = faker.helpers.arrayElement(osOptions);
      const browser = faker.helpers.arrayElement(BROWSERS);

      visitsData.push({
        path: faker.helpers.arrayElement(paths),
        referrer: faker.helpers.arrayElement(REFERRERS),
        userAgent: `${browser}; ${os}; ${device}`,
        device,
        os,
        browser,
        customerId: customer?.id ?? null,
        sessionKey: `sess-${faker.string.alphanumeric(16)}`,
        ipAddress: `14.232.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}`, // VN IP ranges usually 14.x.x.x, 113.x.x.x, etc
        createdAt,
      });
    }

    // Sort by date
    visitsData.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());

    let created = 0;
    const BATCH_SIZE = 5000;
    for (let i = 0; i < visitsData.length; i += BATCH_SIZE) {
      const batch = visitsData.slice(i, i + BATCH_SIZE);
      await prisma.pageVisit.createMany({ data: batch });
      created += batch.length;
      console.log(`Inserted ${Math.min(i + BATCH_SIZE, visitsData.length)} visits...`);
    }

    console.log(`Seed page visits done: ${created} rows.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedPageVisits().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
