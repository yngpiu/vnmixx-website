import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { resolveSeedAsOfDate, yearsBefore } from './seed-date-range';

const MEDIA_COUNT = Number(process.env.SEED_MEDIA_COUNT ?? 120);

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
      'products/summer-2024',
      'products/winter-2025',
      'products/winter-2024',
      'avatars',
      'banners',
      'blogs',
      'reviews',
    ];

    const folderIdByPath = new Map<string, number>();
    for (const path of folders) {
      const parts = path.split('/').filter(Boolean);
      let parentId: number | null = null;
      let currentPath = '';

      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const row: { id: number } = await prisma.mediaFolder.upsert({
          where: { path: currentPath },
          create: { path: currentPath, name: part, parentId },
          update: { name: part, parentId },
          select: { id: true },
        });
        parentId = row.id;
        folderIdByPath.set(currentPath, row.id);
      }
    }

    const employees: { id: number }[] = await prisma.employee.findMany({
      take: 10,
      select: { id: true },
    });
    const uploaderIds = employees.map((e) => e.id);

    faker.seed(444);
    const asOf = resolveSeedAsOfDate();
    const rangeStart = yearsBefore(asOf, 3);

    const files: Prisma.MediaFileCreateManyInput[] = [];

    for (let i = 0; i < MEDIA_COUNT; i++) {
      const folder = faker.helpers.arrayElement(folders);
      const isImage = faker.datatype.boolean({ probability: 0.9 });
      const extension = isImage
        ? faker.helpers.arrayElement(['.jpg', '.png', '.webp'])
        : faker.helpers.arrayElement(['.mp4', '.pdf']);
      const fileName = `${faker.string.alphanumeric(10)}${extension}`;
      const key = folder ? `${folder}/${fileName}` : fileName;
      const mimeType = isImage
        ? `image/${extension.replace('.', '')}`
        : extension === '.mp4'
          ? 'video/mp4'
          : 'application/pdf';

      files.push({
        key,
        fileName,
        folder,
        folderId: folderIdByPath.get(folder) ?? null,
        mimeType: mimeType.replace('jpg', 'jpeg'),
        size: faker.number.int({ min: 1024 * 50, max: 1024 * 5000 }),
        width: isImage ? faker.helpers.arrayElement([800, 1024, 1200, 1920]) : null,
        height: isImage ? faker.helpers.arrayElement([600, 800, 1080]) : null,
        uploadedBy: uploaderIds.length > 0 ? faker.helpers.arrayElement(uploaderIds) : null,
        createdAt: faker.date.between({ from: rangeStart, to: asOf }),
      });
    }

    let created = 0;
    const BATCH_SIZE = 100;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await prisma.mediaFile.createMany({ data: batch, skipDuplicates: true });
      created += batch.length;
    }

    console.log(`Seed media done: ${folders.length} folders and ${created} files.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedMedia().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
