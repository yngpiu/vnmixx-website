import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';

const PATHS = ['/', '/products', '/products/seed-sp-001', '/cart', '/checkout', '/about'];
const DEVICES = ['desktop', 'mobile', 'tablet'] as const;
const OS = ['Windows 11', 'macOS 14', 'Android 14', 'iOS 18'];
const BROWSERS = ['Chrome 124', 'Safari 17', 'Firefox 124', 'Edge 123'];

function randomPick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
      take: 30,
    });
    let created = 0;
    for (let i = 0; i < 1200; i += 1) {
      const daysAgo = randomInt(0, 120);
      const minutesAgo = randomInt(0, 1439);
      const createdAt = new Date(Date.now() - daysAgo * 86_400_000 - minutesAgo * 60_000);
      const customer = customers.length > 0 && Math.random() < 0.45 ? randomPick(customers) : null;
      const device = randomPick(DEVICES);
      const os = randomPick(OS);
      const browser = randomPick(BROWSERS);
      await prisma.pageVisit.create({
        data: {
          path: randomPick(PATHS),
          referrer: Math.random() < 0.4 ? 'https://google.com' : null,
          userAgent: `${browser}; ${os}; ${device}`,
          device,
          os,
          browser,
          customerId: customer?.id ?? null,
          sessionKey: `seed-session-${Math.floor(i / 3)}`,
          ipAddress: `10.0.0.${(i % 200) + 1}`,
          createdAt,
        },
      });
      created += 1;
    }
    console.log(`Seed page visits done: ${created} rows.`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  await seedPageVisits();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
