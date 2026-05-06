import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { hash } from 'bcrypt';
import { CustomerStatus, Gender, Prisma, PrismaClient } from '../generated/prisma/client';
import { SEED_CONFIG } from './seed-constants';
import {
  clampDate,
  resolveSeedAsOfDate,
  seedWindowThirdBoundaries,
  yearsBefore,
} from './seed-date-range';

const BCRYPT_ROUNDS = 10;

function resolveCustomerSeedCount(): number {
  const raw = process.env.SEED_CUSTOMER_COUNT;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1) return Math.min(n, 50_000);
  }
  return SEED_CONFIG.customerCount;
}

function pravatarUrl(seed: string): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
}

export async function seedCustomers(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const customerCount = resolveCustomerSeedCount();
    const hashedPassword = await hash(SEED_CONFIG.devSeedPassword, BCRYPT_ROUNDS);
    let created = 0;

    faker.seed(456);

    const customers: Prisma.CustomerCreateManyInput[] = [];
    const emails = new Set();
    const phones = new Set();

    const asOf = resolveSeedAsOfDate();
    const rangeStart = yearsBefore(asOf, 3);
    const { y1, y2 } = seedWindowThirdBoundaries(rangeStart, asOf);

    for (let i = 0; i < customerCount; i += 1) {
      const isMale = faker.datatype.boolean();
      const gender = isMale ? Gender.MALE : Gender.FEMALE;
      const fullName = faker.person.fullName({ sex: isMale ? 'male' : 'female' });

      let phonePrefix = faker.helpers.arrayElement(['03', '05', '07', '08', '09']);
      let phoneNumber = `${phonePrefix}${faker.string.numeric(8)}`;
      while (phones.has(phoneNumber)) {
        phonePrefix = faker.helpers.arrayElement(['03', '05', '07', '08', '09']);
        phoneNumber = `${phonePrefix}${faker.string.numeric(8)}`;
      }
      phones.add(phoneNumber);

      const emailName = faker.internet
        .username({ firstName: fullName.split(' ').pop(), lastName: fullName.split(' ')[0] })
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      let email = `${emailName}.kh${i}@gmail.com`;
      while (emails.has(email)) {
        email = `${emailName}.kh${i}_${faker.string.numeric(2)}@gmail.com`;
      }
      emails.add(email);

      const dob = faker.date.birthdate({ min: 18, max: 60, mode: 'age' });

      let createdAt: Date;
      const r = faker.number.float({ min: 0, max: 1 });
      if (r < 0.2) {
        createdAt = faker.date.between({ from: rangeStart, to: y1 });
      } else if (r < 0.5) {
        createdAt = faker.date.between({ from: y1, to: y2 });
      } else {
        createdAt = faker.date.between({ from: y2, to: asOf });
      }
      createdAt = clampDate(createdAt, rangeStart, asOf);
      if (faker.datatype.boolean({ probability: 0.3 })) {
        const peakMonth = faker.helpers.arrayElement([0, 10, 11]);
        const shifted = new Date(createdAt);
        shifted.setMonth(peakMonth);
        createdAt = clampDate(shifted, rangeStart, asOf);
      }

      const emailVerifiedAt = faker.datatype.boolean({ probability: 0.8 })
        ? new Date(createdAt.getTime() + faker.number.int({ min: 1000, max: 86400000 }))
        : null;
      const status = emailVerifiedAt ? CustomerStatus.ACTIVE : CustomerStatus.PENDING_VERIFICATION;
      const avatarUrl = faker.datatype.boolean({ probability: 0.3 }) ? pravatarUrl(email) : null;

      customers.push({
        fullName,
        email,
        phoneNumber,
        dob,
        gender,
        hashedPassword,
        avatarUrl,
        status,
        emailVerifiedAt,
        createdAt,
        updatedAt: createdAt,
      });
    }

    const BATCH_SIZE = 500;
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);
      await prisma.customer.createMany({
        data: batch,
        skipDuplicates: true,
      });
      created += batch.length;
    }

    const total = await prisma.customer.count({
      where: { deletedAt: null, status: CustomerStatus.ACTIVE },
    });
    console.log(`Seed customers done: created=${created}, active customers in DB=${total}`);
  } finally {
    await prisma.$disconnect();
  }
}
