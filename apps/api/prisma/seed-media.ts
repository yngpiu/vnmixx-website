import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';

export async function seedMedia(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const folders = [
      'products',
      'products/summer-2025',
      'products/winter-2024',
      'avatars',
      'banners',
      'blogs',
    ];

    for (const path of folders) {
      await prisma.mediaFolder.upsert({
        where: { path },
        create: { path },
        update: {},
      });
    }

    const employees = await prisma.employee.findMany({ take: 5 });
    const uploaderId = employees[0]?.id;

    const files = [
      {
        key: 'products/banner-main.jpg',
        fileName: 'banner-main.jpg',
        folder: 'products',
        mimeType: 'image/jpeg',
        size: 1024 * 500,
        width: 1920,
        height: 1080,
      },
      {
        key: 'banners/sale-off.png',
        fileName: 'sale-off.png',
        folder: 'banners',
        mimeType: 'image/png',
        size: 1024 * 200,
        width: 1200,
        height: 400,
      },
    ];

    for (const file of files) {
      await prisma.mediaFile.upsert({
        where: { key: file.key },
        create: {
          ...file,
          uploadedBy: uploaderId,
        },
        update: {},
      });
    }

    console.log(`Seed media done: ${folders.length} folders and ${files.length} files.`);
  } finally {
    await prisma.$disconnect();
  }
}
