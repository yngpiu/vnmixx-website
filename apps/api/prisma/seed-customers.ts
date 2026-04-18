import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { hash } from 'bcrypt';
import 'dotenv/config';
import { Gender, Prisma, PrismaClient } from '../generated/prisma/client';

const BCRYPT_ROUNDS = 10;
const CUSTOMER_COUNT = 5000;

const seedPassword = () => process.env.SEED_CUSTOMER_PASSWORD ?? '123123';

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
    const hashedPassword = await hash(seedPassword(), BCRYPT_ROUNDS);
    let created = 0;

    faker.seed(456);

    const customers: Prisma.CustomerCreateManyInput[] = [];
    const emails = new Set();
    const phones = new Set();

    // Generate trend dates over last 2 years
    // More customers in recent months, some peaks around Nov-Jan
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    for (let i = 0; i < CUSTOMER_COUNT; i += 1) {
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

      // Timeline logic: more recent signups
      let createdAt: Date;
      const r = faker.number.float({ min: 0, max: 1 });
      if (r < 0.2) {
        // First year
        createdAt = faker.date.between({
          from: twoYearsAgo,
          to: new Date(twoYearsAgo.getTime() + 365 * 24 * 60 * 60 * 1000),
        });
      } else if (r < 0.5) {
        // Second year H1
        createdAt = faker.date.between({
          from: new Date(twoYearsAgo.getTime() + 365 * 24 * 60 * 60 * 1000),
          to: new Date(twoYearsAgo.getTime() + 547 * 24 * 60 * 60 * 1000),
        });
      } else {
        // Second year H2 (more users)
        createdAt = faker.date.between({
          from: new Date(twoYearsAgo.getTime() + 547 * 24 * 60 * 60 * 1000),
          to: new Date(),
        });
      }

      // Add seasonal peaks (e.g. November, December, January)
      if (faker.datatype.boolean({ probability: 0.3 })) {
        const peakMonth = faker.helpers.arrayElement([0, 10, 11]); // Jan, Nov, Dec
        createdAt.setMonth(peakMonth);
      }

      const emailVerifiedAt = faker.datatype.boolean({ probability: 0.8 })
        ? new Date(createdAt.getTime() + faker.number.int({ min: 1000, max: 86400000 }))
        : null;
      const avatarUrl = faker.datatype.boolean({ probability: 0.3 }) ? pravatarUrl(email) : null;

      customers.push({
        fullName,
        email,
        phoneNumber,
        dob,
        gender,
        hashedPassword,
        avatarUrl,
        isActive: true,
        emailVerifiedAt,
        createdAt,
        updatedAt: createdAt,
      });
    }

    // Insert in batches
    const BATCH_SIZE = 500;
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);
      await prisma.customer.createMany({
        data: batch,
        skipDuplicates: true,
      });
      created += batch.length;
    }

    const total = await prisma.customer.count({ where: { deletedAt: null } });
    console.log(`Seed customers done: created=${created}, active customers in DB=${total}`);
  } finally {
    await prisma.$disconnect();
  }
}
