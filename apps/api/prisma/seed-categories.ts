import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

type CatLeaf = string | { name: string; isActive?: boolean };

type CatL2 = {
  name: string;
  isActive?: boolean;
  children: CatLeaf[];
};

type CatL1 = {
  name: string;
  isActive?: boolean;
  children: CatL2[];
};

const FASHION_TREE: CatL1[] = [
  {
    name: 'Nam',
    children: [
      {
        name: 'Áo',
        children: ['Áo thun', 'Áo polo', 'Áo sơ mi', 'Áo len', 'Áo khoác'],
      },
      {
        name: 'Quần',
        children: ['Quần dài', 'Quần jeans', 'Quần lửng/short'],
      },
    ],
  },
  {
    name: 'Nữ',
    children: [
      {
        name: 'Áo',
        children: ['Áo sơ mi', 'Áo thun', 'Áo croptop', 'Áo len', 'Đồ lót 50k -150k'],
      },
      {
        name: 'Áo khoác',
        children: [
          'Dạ lông cừu | SALE off 50%',
          'Áo dạ/ măng tô',
          'Áo vest/ blazer',
          'Áo phao',
          'Áo gile',
        ],
      },
      {
        name: 'Set bộ',
        children: ['Set bộ công sở', 'Set bộ co-ords', 'Set bộ thun/ len'],
      },
      {
        name: 'Quần & Jumpsuit',
        children: ['Quần dài', 'Quần jeans', 'Quần lửng/ short', 'Jumpsuit'],
      },
      {
        name: 'Chân váy',
        children: ['Chân váy bút chì', 'Chân váy chữ A', 'Chân váy jeans'],
      },
      {
        name: 'Đầm/ Áo dài',
        children: ['Đầm công sở', 'Đầm voan hoa/ maxi', 'Đầm thun', 'Áo dài'],
      },
    ],
  },
];

const SLUG_MAX = 120;

function slugifyVn(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function hashTail(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return (h % 46655).toString(36);
}

function fitSlug(s: string): string {
  if (s.length <= SLUG_MAX) return s;
  const tail = `-${hashTail(s)}`;
  return `${s.slice(0, SLUG_MAX - tail.length)}${tail}`;
}

function allocSlug(base: string, used: Set<string>): string {
  let candidate = fitSlug(base);
  let n = 2;
  while (used.has(candidate)) {
    const suffix = `-${n}`;
    n += 1;
    candidate = fitSlug(base.slice(0, SLUG_MAX - suffix.length) + suffix);
  }
  used.add(candidate);
  return candidate;
}

function leafMeta(leaf: CatLeaf): { name: string; isActive: boolean } {
  if (typeof leaf === 'string') {
    return { name: leaf, isActive: true };
  }
  return { name: leaf.name, isActive: leaf.isActive !== false };
}

async function deleteLegacySeedSlugs(prisma: PrismaClient): Promise<void> {
  const legacyPrefix = { slug: { startsWith: 'seed-dm-' as const } };
  await prisma.category.deleteMany({
    where: { AND: [legacyPrefix, { slug: { contains: '-l3-' } }] },
  });
  await prisma.category.deleteMany({
    where: {
      AND: [legacyPrefix, { slug: { contains: '-l2-' } }, { NOT: { slug: { contains: '-l3-' } } }],
    },
  });
  await prisma.category.deleteMany({
    where: {
      AND: [legacyPrefix, { NOT: { slug: { contains: '-l2-' } } }],
    },
  });
}

export async function seedCategories(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  if (FASHION_TREE.length !== 2) {
    throw new Error(
      `FASHION_TREE phải có đúng 2 nhóm cấp 1 (Nam/Nữ), hiện có ${FASHION_TREE.length}.`,
    );
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    await deleteLegacySeedSlugs(prisma);

    const usedSlugs = new Set<string>();
    let l1Count = 0;
    let l2Count = 0;
    let l3Count = 0;
    let inactiveCount = 0;

    for (let i = 0; i < FASHION_TREE.length; i += 1) {
      const branch = FASHION_TREE[i];
      const l1Active = branch.isActive !== false;
      if (!l1Active) inactiveCount += 1;

      const s1 = allocSlug(slugifyVn(branch.name), usedSlugs);

      const cat1 = await prisma.category.upsert({
        where: { slug: s1 },
        create: {
          name: branch.name,
          slug: s1,
          parentId: null,
          sortOrder: i,
          isFeatured: i < 4 && l1Active,
          showInHeader: true,
          isActive: l1Active,
        },
        update: {
          name: branch.name,
          parentId: null,
          sortOrder: i,
          isFeatured: i < 4 && l1Active,
          showInHeader: true,
          isActive: l1Active,
          deletedAt: null,
        },
      });
      l1Count += 1;

      for (let j = 0; j < branch.children.length; j += 1) {
        const l2 = branch.children[j];
        const l2Active = l2.isActive !== false && l1Active;
        if (!l2Active) inactiveCount += 1;

        const s2 = allocSlug(`${s1}-${slugifyVn(l2.name)}`, usedSlugs);

        const cat2 = await prisma.category.upsert({
          where: { slug: s2 },
          create: {
            name: l2.name,
            slug: s2,
            parentId: cat1.id,
            sortOrder: j,
            isFeatured: false,
            showInHeader: false,
            isActive: l2Active,
          },
          update: {
            name: l2.name,
            parentId: cat1.id,
            sortOrder: j,
            showInHeader: false,
            isActive: l2Active,
            deletedAt: null,
          },
        });
        l2Count += 1;

        for (let k = 0; k < l2.children.length; k += 1) {
          const leaf = l2.children[k];
          const { name: nameL3, isActive: leafActive } = leafMeta(leaf);
          const l3Active = leafActive && l2Active;
          if (!l3Active) inactiveCount += 1;

          const s3 = allocSlug(`${s2}-${slugifyVn(nameL3)}`, usedSlugs);

          await prisma.category.upsert({
            where: { slug: s3 },
            create: {
              name: nameL3,
              slug: s3,
              parentId: cat2.id,
              sortOrder: k,
              isFeatured: false,
              showInHeader: false,
              isActive: l3Active,
            },
            update: {
              name: nameL3,
              parentId: cat2.id,
              sortOrder: k,
              showInHeader: false,
              isActive: l3Active,
              deletedAt: null,
            },
          });
          l3Count += 1;
        }
      }
    }

    console.log(
      `Seed categories done: level1=${l1Count}, level2=${l2Count}, level3=${l3Count}, nút isActive=false≈${inactiveCount} (tổng ${l1Count + l2Count + l3Count} bản ghi).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
