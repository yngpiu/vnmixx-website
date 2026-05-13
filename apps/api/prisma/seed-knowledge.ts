import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient, ShopContentKey } from '../generated/prisma/client';

const TERMS_DIR = path.resolve(__dirname, 'data/terms');

interface TermFile {
  key: ShopContentKey;
  title: string;
  fileName: string;
}

const TERM_FILES: TermFile[] = [
  { key: ShopContentKey.STORE_INFO, title: 'Về chúng tôi — VNMIXX', fileName: 'thong_tin.md' },
  {
    key: ShopContentKey.RETURN_POLICY,
    title: 'Chính sách đổi hàng',
    fileName: 'chinh_sach_doi_tra.md',
  },
  {
    key: ShopContentKey.WARRANTY_POLICY,
    title: 'Chính sách bảo hành & sửa chữa',
    fileName: 'chinh_sach_bao_hanh.md',
  },
  {
    key: ShopContentKey.TERMS,
    title: 'Chính sách điều khoản sử dụng',
    fileName: 'chinh_sach_dieu_khoan.md',
  },
  {
    key: ShopContentKey.FAQ,
    title: 'Câu hỏi thường gặp (Q&A)',
    fileName: 'q_n_a.md',
  },
];

export async function seedKnowledge(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL');
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });
  try {
    for (const term of TERM_FILES) {
      const filePath = path.join(TERMS_DIR, term.fileName);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠ File không tồn tại, bỏ qua: ${filePath}`);
        continue;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      await prisma.shopContent.upsert({
        where: { key: term.key },
        create: { key: term.key, title: term.title, content },
        update: { title: term.title, content },
      });
      console.log(`✅ Upserted: ${term.key}`);
    }
    console.log('Seed shop content hoàn tất.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedKnowledge().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
