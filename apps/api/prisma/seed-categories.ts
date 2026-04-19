import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
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

/**
 * Cây danh mục seed shop quần áo (VN). Slug sinh từ tên (ASCII, gạch ngang).
 * Một số nút `isActive: false` để demo lọc / ẩn trên storefront.
 */
const FASHION_TREE: CatL1[] = [
  {
    name: 'Áo nam',
    children: [
      {
        name: 'Áo thun nam',
        children: ['Áo thun cổ tròn', 'Áo thun cổ bẻ polo', 'Áo thun tay dài'],
      },
      {
        name: 'Áo sơ mi nam',
        children: ['Sơ mi trắng công sở', 'Sơ mi kẻ caro', 'Sơ mi linen'],
      },
    ],
  },
  {
    name: 'Quần nam',
    children: [
      {
        name: 'Quần jean nam',
        children: ['Jean slim fit', 'Jean ống suông', { name: 'Jean rách gối', isActive: false }],
      },
      {
        name: 'Quần tây & Kaki',
        children: ['Quần tây công sở', 'Quần kaki lửng', 'Quần chinos'],
      },
    ],
  },
  {
    name: 'Áo nữ',
    children: [
      {
        name: 'Áo thun & Tank top nữ',
        children: ['Áo thun ôm body', 'Áo hai dây', 'Áo crop top'],
      },
      {
        name: 'Áo sơ mi & Blouse',
        children: ['Blouse cổ bèo', 'Sơ mi oversize', 'Áo kiểu voan'],
      },
    ],
  },
  {
    name: 'Quần & Chân váy nữ',
    children: [
      {
        name: 'Quần jean & Legging',
        children: ['Jean cạp cao', 'Jean baggy', 'Legging thể thao'],
      },
      {
        name: 'Quần short & Culottes',
        children: ['Short kaki nữ', { name: 'Quần culottes', isActive: false }, 'Short jean'],
      },
    ],
  },
  {
    name: 'Đầm & Váy',
    children: [
      {
        name: 'Đầm dự tiệc',
        children: ['Đầm maxi', 'Đầm body', 'Đầm xòe công chúa'],
      },
      {
        name: 'Chân váy',
        children: ['Chân váy chữ A', 'Chân váy bút chì', 'Chân váy xếp ly'],
      },
    ],
  },
  {
    name: 'Áo khoác & Vest',
    children: [
      {
        name: 'Áo khoác mỏng',
        children: ['Áo khoác gió', 'Áo hoodie', 'Áo cardigan'],
      },
      {
        name: 'Áo khoác ấm',
        children: ['Áo phao', 'Áo trench coat', 'Blazer'],
      },
    ],
  },
  {
    name: 'Đồ bộ & Đồ ngủ',
    children: [
      {
        name: 'Đồ bộ mặc nhà',
        children: ['Bộ cotton', { name: 'Bộ satin', isActive: false }, 'Bộ short tay ngắn'],
      },
      {
        name: 'Đồ ngủ',
        children: ['Pijama dài tay', 'Váy ngủ', 'Áo choàng tắm'],
      },
    ],
  },
  {
    name: 'Đồ lót nam',
    children: [
      {
        name: 'Quần lót nam',
        children: ['Boxer', 'Brief', 'Quần lót thể thao'],
      },
      {
        name: 'Áo lót nam',
        children: ['Áo ba lỗ', 'Áo lót giữ nhiệt', 'Áo tank top'],
      },
    ],
  },
  {
    name: 'Đồ lót nữ',
    children: [
      {
        name: 'Bra & Áo ngực',
        children: ['Áo bra không gọng', 'Áo bra thể thao', { name: 'Áo bra ren', isActive: false }],
      },
      {
        name: 'Quần lót nữ',
        children: ['Quần su', 'Quần ren', 'Quần lót seamless'],
      },
    ],
  },
  {
    name: 'Giày nam',
    children: [
      {
        name: 'Giày sneaker nam',
        children: ['Sneaker trắng', { name: 'Sneaker chunky', isActive: false }, 'Sneaker chạy bộ'],
      },
      {
        name: 'Giày da & Lười',
        children: ['Giày tây buộc dây', 'Giày lười penny', 'Boot chelsea'],
      },
    ],
  },
  {
    name: 'Giày nữ',
    children: [
      {
        name: 'Giày cao gót',
        isActive: false,
        children: ['Gót nhọn', 'Gót vuông', 'Sandals cao gót'],
      },
      {
        name: 'Giày bệt & Sneaker nữ',
        children: ['Ballet flats', 'Sneaker nữ', 'Sandals quai hậu'],
      },
    ],
  },
  {
    name: 'Túi xách & Balo',
    children: [
      {
        name: 'Túi xách tay',
        children: ['Túi tote', 'Túi bucket', 'Túi đeo chéo mini'],
      },
      {
        name: 'Balo & Túi du lịch',
        children: ['Balo laptop', 'Balo canvas', { name: 'Túi weekender', isActive: false }],
      },
    ],
  },
  {
    name: 'Phụ kiện thời trang',
    children: [
      {
        name: 'Mũ nón',
        children: ['Mũ lưỡi trai', { name: 'Mũ bucket', isActive: false }, 'Nón rộng vành'],
      },
      {
        name: 'Thắt lưng & Khăn',
        isActive: false,
        children: ['Thắt lưng da', 'Khăn choàng cổ', 'Tất cổ ngắn'],
      },
    ],
  },
  {
    name: 'Đồ bơi & Đi biển',
    isActive: false,
    children: [
      {
        name: 'Đồ bơi nữ',
        children: ['Bikini', 'Đồ bơi một mảnh', 'Áo choàng đi biển'],
      },
      {
        name: 'Đồ bơi nam',
        children: ['Quần bơi short', 'Quần bơi dài', 'Áo rashguard'],
      },
    ],
  },
  {
    name: 'Thời trang bé trai',
    children: [
      {
        name: 'Áo bé trai',
        children: ['Áo thun in hình', 'Áo sơ mi bé', 'Áo khoác gió bé'],
      },
      {
        name: 'Quần bé trai',
        children: ['Quần short thun', 'Quần jean bé', 'Quần thể thao bé'],
      },
    ],
  },
  {
    name: 'Thời trang bé gái',
    children: [
      {
        name: 'Váy & Đầm bé gái',
        children: ['Váy xòe bé', 'Đầm tiệc bé', 'Chân váy bé'],
      },
      {
        name: 'Set đồ bé gái',
        children: ['Set áo quần', 'Set váy + áo khoác', 'Bộ đồ ngủ bé'],
      },
    ],
  },
  {
    name: 'Đồ thể thao nam',
    children: [
      {
        name: 'Áo gym nam',
        children: ['Áo tank gym', 'Áo compression', 'Áo thun dry-fit'],
      },
      {
        name: 'Quần gym nam',
        children: ['Quần jogger gym', 'Quần short tập', 'Quần legging nam'],
      },
    ],
  },
  {
    name: 'Đồ thể thao nữ',
    children: [
      {
        name: 'Áo tập nữ',
        children: ['Áo bra tập', 'Áo crop gym', 'Áo dài tay yoga'],
      },
      {
        name: 'Quần tập nữ',
        children: ['Legging tập', 'Quần short gym', 'Quần jogger nữ'],
      },
    ],
  },
  {
    name: 'Đồ công sở',
    children: [
      {
        name: 'Vest & Comple',
        children: ['Vest nam', 'Comple 2 mảnh', 'Áo ghi lê'],
      },
      {
        name: 'Chân váy & Áo công sở nữ',
        children: ['Chân váy bút chì công sở', 'Áo blouse công sở', 'Áo blazer nữ'],
      },
    ],
  },
  {
    name: 'Denim & Streetwear',
    children: [
      {
        name: 'Áo denim & Oversize',
        children: ['Áo khoác jean', 'Áo hoodie oversize', 'Áo flannel'],
      },
      {
        name: 'Quần street',
        children: ['Jean wide leg', 'Quần cargo', 'Quần jogger nỉ'],
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

  if (FASHION_TREE.length !== 20) {
    throw new Error(`FASHION_TREE phải có đúng 20 nhóm cấp 1, hiện có ${FASHION_TREE.length}.`);
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
          isActive: l1Active,
        },
        update: {
          name: branch.name,
          parentId: null,
          sortOrder: i,
          isFeatured: i < 4 && l1Active,
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
            isActive: l2Active,
          },
          update: {
            name: l2.name,
            parentId: cat1.id,
            sortOrder: j,
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
              isActive: l3Active,
            },
            update: {
              name: nameL3,
              parentId: cat2.id,
              sortOrder: k,
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
