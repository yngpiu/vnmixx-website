import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AddressType, PrismaClient } from '../generated/prisma/client';

async function wipeSeedAddresses(prisma: PrismaClient): Promise<void> {
  await prisma.address.deleteMany({});
}

export async function seedAddresses(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    await wipeSeedAddresses(prisma);
    console.log('Cleared existing address data.');

    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      take: 100,
    });

    const wards = await prisma.ward.findMany({
      take: 200,
      include: {
        district: {
          include: {
            city: true,
          },
        },
      },
    });

    if (customers.length === 0 || wards.length === 0) {
      console.log('Customers or Wards missing. Run seedCustomers and seedLocations first.');
      return;
    }

    let created = 0;
    for (const customer of customers) {
      const addressCount = Math.random() > 0.7 ? 2 : 1;
      for (let i = 0; i < addressCount; i++) {
        const ward = wards[Math.floor(Math.random() * wards.length)];
        await prisma.address.create({
          data: {
            customerId: customer.id,
            fullName: customer.fullName,
            phoneNumber: customer.phoneNumber,
            cityId: ward.district.cityId,
            districtId: ward.districtId,
            wardId: ward.id,
            addressLine: `${Math.floor(Math.random() * 500) + 1}nd Street`,
            type: i === 0 ? AddressType.HOME : AddressType.OFFICE,
            isDefault: i === 0,
          },
        });
        created += 1;
      }
    }

    console.log(`Seed addresses done: ${created} addresses created.`);
  } finally {
    await prisma.$disconnect();
  }
}
