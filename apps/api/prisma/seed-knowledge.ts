import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '../generated/prisma/client';

const TERMS_DIR = path.resolve(__dirname, 'data/terms');

interface TermFile {
  slug: string;
  title: string;
  fileName: string;
}

const TERM_FILES: TermFile[] = [
  { slug: 've-chung-toi', title: 'Về chúng tôi — VNMIXX', fileName: 'thong_tin.md' },
  {
    slug: 'chinh-sach-doi-tra',
    title: 'Chính sách đổi hàng',
    fileName: 'chinh_sach_doi_tra.md',
  },
  {
    slug: 'chinh-sach-bao-hanh',
    title: 'Chính sách bảo hành & sửa chữa',
    fileName: 'chinh_sach_bao_hanh.md',
  },
  {
    slug: 'chinh-sach-dieu-khoan',
    title: 'Chính sách điều khoản sử dụng',
    fileName: 'chinh_sach_dieu_khoan.md',
  },
  {
    slug: 'cau-hoi-thuong-gap',
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
      await prisma.aiKnowledgeBase.upsert({
        where: { slug: term.slug },
        create: { slug: term.slug, title: term.title, content, isActive: true },
        update: { title: term.title, content, isActive: true },
      });
      console.log(`✅ Upserted: ${term.slug}`);
    }
    console.log('Seed knowledge base hoàn tất.');
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
