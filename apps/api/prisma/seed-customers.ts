import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { hash } from 'bcrypt';
import 'dotenv/config';
import { Gender, PrismaClient } from '../generated/prisma/client';

const BCRYPT_ROUNDS = 10;
const CUSTOMER_COUNT = 100;

/** Mật khẩu dùng chung cho tài khoản khách seed (dev). Có thể ghi đè bằng SEED_CUSTOMER_PASSWORD. */
const seedPassword = () => process.env.SEED_CUSTOMER_PASSWORD ?? '123123';

function pravatarUrl(seed: string): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
}

function assertVnMobile10(phone: string, label: string): void {
  if (!/^0[35789]\d{8}$/.test(phone)) {
    throw new Error(
      `${label}: số điện thoại phải đúng 10 số dạng di động VN (0[35789] + 8 chữ số): ${phone}`,
    );
  }
}

/** Họ phổ biến tại Việt Nam (dùng cho dữ liệu demo, không gắn cá nhân cụ thể). */
const HO = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Huỳnh',
  'Phan',
  'Vũ',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Hồ',
  'Ngô',
  'Dương',
  'Lý',
  'Đinh',
  'Tạ',
  'Chu',
  'La',
  'Mai',
  'Vương',
  'Quách',
  'Thái',
  'Cao',
  'Đoàn',
  'Phùng',
  'Lưu',
  'Tôn',
  'Hà',
];

const TEN_DEM_NAM = [
  'Văn',
  'Đức',
  'Minh',
  'Quốc',
  'Thanh',
  'Đình',
  'Gia',
  'Hữu',
  'Tuấn',
  'Hoàng',
  'Xuân',
  'Thế',
  'Công',
  'Đăng',
  'Trung',
];

const TEN_NAM = [
  'Anh',
  'Bình',
  'Cường',
  'Dũng',
  'Phúc',
  'Hải',
  'Khang',
  'Long',
  'Nam',
  'Phong',
  'Quân',
  'Sơn',
  'Tài',
  'Vinh',
  'Kiệt',
  'Hiếu',
  'Huy',
  'Đạt',
  'Thịnh',
  'Tuấn',
  'Hùng',
  'Duy',
  'Khoa',
  'Lộc',
  'Tùng',
];

const TEN_DEM_NU = [
  'Thị',
  'Ngọc',
  'Thanh',
  'Thu',
  'Bích',
  'Phương',
  'Hoài',
  'Diệu',
  'Hồng',
  'Kim',
  'Tú',
  'Bảo',
  'Gia',
  'Minh',
  'Ánh',
];

const TEN_NU = [
  'An',
  'Chi',
  'Dung',
  'Hà',
  'Hương',
  'Lan',
  'Linh',
  'Mai',
  'Nga',
  'Oanh',
  'Phượng',
  'Quyên',
  'Thảo',
  'Trang',
  'Uyên',
  'Vân',
  'Yến',
  'My',
  'Hạnh',
  'Loan',
  'Nhi',
  'Vy',
  'Hằng',
  'Tuyết',
  'Xuân',
];

function fullNameForIndex(i: number, gender: Gender): string {
  const ho = HO[i % HO.length];
  if (gender === Gender.MALE) {
    const dem = TEN_DEM_NAM[(i * 3) % TEN_DEM_NAM.length];
    const ten = TEN_NAM[(i * 7) % TEN_NAM.length];
    return `${ho} ${dem} ${ten}`;
  }
  if (gender === Gender.FEMALE) {
    const dem = TEN_DEM_NU[(i * 5) % TEN_DEM_NU.length];
    const ten = TEN_NU[(i * 11) % TEN_NU.length];
    return `${ho} ${dem} ${ten}`;
  }
  const dem = TEN_DEM_NAM[(i * 13) % TEN_DEM_NAM.length];
  const ten = TEN_NAM[(i * 17) % TEN_NAM.length];
  return `${ho} ${dem} ${ten}`;
}

function genderForIndex(i: number): Gender {
  const r = i % 5;
  if (r === 4) return Gender.OTHER;
  return r % 2 === 0 ? Gender.MALE : Gender.FEMALE;
}

/** Ngày sinh hợp lý (khoảng 18–55 tuổi tại năm 2026), chỉ dùng phần ngày. */
function dobForIndex(i: number): Date {
  const year = 1971 + (i % 35);
  const month = 1 + ((i * 5) % 12);
  const day = 1 + ((i * 11) % 28);
  return new Date(Date.UTC(year, month - 1, day));
}

function customerRow(i: number): {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: Gender;
  dob: Date;
  emailVerifiedAt: Date | null;
} {
  const gender = genderForIndex(i);
  const fullName = fullNameForIndex(i, gender);
  const n = String(i + 1).padStart(3, '0');
  const email = `khachhang.vnmixx.seed${n}@gmail.com`;
  const phoneNumber = `09050000${String(i).padStart(2, '0')}`;
  const dob = dobForIndex(i);
  const emailVerifiedAt = i % 4 === 0 ? null : new Date(Date.UTC(2025, i % 12, 1 + (i % 20)));
  return { fullName, email, phoneNumber, gender, dob, emailVerifiedAt };
}

export async function seedCustomers(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  for (let i = 0; i < CUSTOMER_COUNT; i += 1) {
    const row = customerRow(i);
    assertVnMobile10(row.phoneNumber, row.fullName);
    if (!row.email.endsWith('@gmail.com')) {
      throw new Error(`${row.fullName}: email phải kết thúc bằng @gmail.com`);
    }
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await hash(seedPassword(), BCRYPT_ROUNDS);
    let created = 0;
    let updated = 0;

    for (let i = 0; i < CUSTOMER_COUNT; i += 1) {
      const row = customerRow(i);
      const existing = await prisma.customer.findUnique({ where: { email: row.email } });
      const avatarUrl = pravatarUrl(row.email);

      await prisma.customer.upsert({
        where: { email: row.email },
        create: {
          fullName: row.fullName,
          email: row.email,
          phoneNumber: row.phoneNumber,
          dob: row.dob,
          gender: row.gender,
          hashedPassword,
          avatarUrl,
          isActive: true,
          emailVerifiedAt: row.emailVerifiedAt,
        },
        update: {
          fullName: row.fullName,
          phoneNumber: row.phoneNumber,
          dob: row.dob,
          gender: row.gender,
          hashedPassword,
          avatarUrl,
          isActive: true,
          emailVerifiedAt: row.emailVerifiedAt,
          deletedAt: null,
        },
      });

      if (existing) updated += 1;
      else created += 1;
    }

    const total = await prisma.customer.count({ where: { deletedAt: null } });
    console.log(
      `Seed customers done: created=${created}, updated=${updated}, active customers in DB=${total}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
