import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { hash } from 'bcrypt';
import 'dotenv/config';
import { EmployeeStatus, PrismaClient } from '../generated/prisma/client';

const BCRYPT_ROUNDS = 10;

/** Mật khẩu đăng nhập dùng chung cho tài khoản seed (chỉ môi trường dev). Có thể ghi đè bằng SEED_EMPLOYEE_PASSWORD. */
const seedPassword = () => process.env.SEED_EMPLOYEE_PASSWORD ?? '123123';

function pravatarUrl(seed: string): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
}

type EmployeeSeed = {
  fullName: string;
  /** Số di động VN đúng 10 ký tự (0xxxxxxxxx), không gồm +84 */
  phoneNumber: string;
  email: string;
  roleName: string;
};

/**
 * Dữ liệu mẫu mang tính thực tế (họ tên, email dạng @gmail.com, số 10 số);
 * không gắn với người thật — chỉ phục vụ demo / dev.
 */
const EMPLOYEES: EmployeeSeed[] = [
  {
    fullName: 'Nguyễn Hoàng Nam',
    phoneNumber: '0987654321',
    email: 'nam.nguyen.cuahang@gmail.com',
    roleName: 'Chủ cửa hàng',
  },
  {
    fullName: 'Phạm Thu Hà',
    phoneNumber: '0912345678',
    email: 'phamthuha.qlch@gmail.com',
    roleName: 'Quản lý cửa hàng',
  },
  {
    fullName: 'Lê Minh Tuấn',
    phoneNumber: '0387654321',
    email: 'leminhtuan.thungan@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Đặng Thị Mai',
    phoneNumber: '0855123987',
    email: 'dangthimai.banhang@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Hoàng Quốc Anh',
    phoneNumber: '0321987654',
    email: 'hoangquocanh.hanghoa@gmail.com',
    roleName: 'Chuyên viên hàng hóa',
  },
  {
    fullName: 'Võ Thị Lan',
    phoneNumber: '0777888999',
    email: 'volan.ketoan@gmail.com',
    roleName: 'Kế toán / kiểm soát',
  },
  {
    fullName: 'Bùi Đức Thịnh',
    phoneNumber: '0909112233',
    email: 'buiducthinh.itns@gmail.com',
    roleName: 'Phụ trách IT & nhân sự',
  },
  {
    fullName: 'Trần Ngọc Ánh',
    phoneNumber: '0933445566',
    email: 'tranngocanh.cs@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Nguyễn Thị Hương',
    phoneNumber: '0925010001',
    email: 'nguyenthihuong.banhang01@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Phan Văn Hùng',
    phoneNumber: '0925010002',
    email: 'phanvanhung.banhang02@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Vũ Thị Nga',
    phoneNumber: '0925010003',
    email: 'vuthinga.banhang03@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Đỗ Minh Khang',
    phoneNumber: '0925010004',
    email: 'dominhkhang.banhang04@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Bùi Thị Yến',
    phoneNumber: '0925010005',
    email: 'buithiyen.banhang05@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Hoàng Thế Vinh',
    phoneNumber: '0925010006',
    email: 'hoangthevinh.hanghoa01@gmail.com',
    roleName: 'Chuyên viên hàng hóa',
  },
  {
    fullName: 'Lý Thu Trang',
    phoneNumber: '0925010007',
    email: 'lythutrang.hanghoa02@gmail.com',
    roleName: 'Chuyên viên hàng hóa',
  },
  {
    fullName: 'Mai Quốc Tiến',
    phoneNumber: '0925010008',
    email: 'maiquoctien.hanghoa03@gmail.com',
    roleName: 'Chuyên viên hàng hóa',
  },
  {
    fullName: 'Tôn Thị Bích',
    phoneNumber: '0925010009',
    email: 'tonthibich.ketoan01@gmail.com',
    roleName: 'Kế toán / kiểm soát',
  },
  {
    fullName: 'Chu Văn Sơn',
    phoneNumber: '0925010010',
    email: 'chuvanson.ketoan02@gmail.com',
    roleName: 'Kế toán / kiểm soát',
  },
  {
    fullName: 'Dương Thị Hạnh',
    phoneNumber: '0925010011',
    email: 'duongthihanh.qlch02@gmail.com',
    roleName: 'Quản lý cửa hàng',
  },
  {
    fullName: 'Hồ Văn Phúc',
    phoneNumber: '0925010012',
    email: 'hovanphuc.qlch03@gmail.com',
    roleName: 'Quản lý cửa hàng',
  },
  {
    fullName: 'Kiều Thị Loan',
    phoneNumber: '0925010013',
    email: 'kieuthiloan.cuahang02@gmail.com',
    roleName: 'Chủ cửa hàng',
  },
  {
    fullName: 'La Minh Đức',
    phoneNumber: '0925010014',
    email: 'lamminhduc.itns02@gmail.com',
    roleName: 'Phụ trách IT & nhân sự',
  },
  {
    fullName: 'Ngô Thị Phượng',
    phoneNumber: '0925010015',
    email: 'ngothiphuong.banhang06@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Quách Văn Tài',
    phoneNumber: '0925010016',
    email: 'quachvantai.hanghoa04@gmail.com',
    roleName: 'Chuyên viên hàng hóa',
  },
  {
    fullName: 'Tạ Thị Linh',
    phoneNumber: '0925010017',
    email: 'tathilinh.ketoan03@gmail.com',
    roleName: 'Kế toán / kiểm soát',
  },
  {
    fullName: 'Uông Văn Hiếu',
    phoneNumber: '0925010018',
    email: 'uongvanhieu.banhang07@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Vương Thị Thảo',
    phoneNumber: '0925010019',
    email: 'vuongthithao.hanghoa05@gmail.com',
    roleName: 'Chuyên viên hàng hóa',
  },
  {
    fullName: 'Yên Văn Long',
    phoneNumber: '0925010020',
    email: 'yenvanlong.qlch04@gmail.com',
    roleName: 'Quản lý cửa hàng',
  },
  {
    fullName: 'An Thị Thu',
    phoneNumber: '0925010021',
    email: 'anthithu.banhang08@gmail.com',
    roleName: 'Thu ngân & tư vấn bán hàng',
  },
  {
    fullName: 'Cao Văn Bình',
    phoneNumber: '0925010022',
    email: 'caovanbinh.hanghoa06@gmail.com',
    roleName: 'Chuyên viên hàng hóa',
  },
];

function assertVnMobile10(phone: string, label: string): void {
  if (!/^0[35789]\d{8}$/.test(phone)) {
    throw new Error(
      `${label}: số điện thoại phải đúng 10 số dạng di động VN (0[35789] + 8 chữ số): ${phone}`,
    );
  }
}

export async function seedEmployees(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  for (const e of EMPLOYEES) {
    assertVnMobile10(e.phoneNumber, e.fullName);
    if (!e.email.endsWith('@gmail.com')) {
      throw new Error(`${e.fullName}: email phải kết thúc bằng @gmail.com`);
    }
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await hash(seedPassword(), BCRYPT_ROUNDS);
    const roles = await prisma.role.findMany({ select: { id: true, name: true } });
    const roleIdByName = new Map(roles.map((r) => [r.name, r.id]));

    let created = 0;
    let updated = 0;

    for (const emp of EMPLOYEES) {
      const roleId = roleIdByName.get(emp.roleName);
      if (roleId === undefined) {
        console.warn(
          `Bỏ qua ${emp.fullName}: không tìm thấy vai trò "${emp.roleName}" (chạy seed RBAC trước).`,
        );
        continue;
      }

      const existing = await prisma.employee.findUnique({ where: { email: emp.email } });
      const avatarUrl = pravatarUrl(emp.email);
      const row = await prisma.employee.upsert({
        where: { email: emp.email },
        create: {
          fullName: emp.fullName,
          email: emp.email,
          phoneNumber: emp.phoneNumber,
          hashedPassword,
          avatarUrl,
          status: EmployeeStatus.ACTIVE,
        },
        update: {
          fullName: emp.fullName,
          phoneNumber: emp.phoneNumber,
          hashedPassword,
          avatarUrl,
          status: EmployeeStatus.ACTIVE,
          deletedAt: null,
        },
      });
      if (existing) updated += 1;
      else created += 1;

      await prisma.employeeRole.upsert({
        where: {
          employeeId_roleId: { employeeId: row.id, roleId },
        },
        create: { employeeId: row.id, roleId },
        update: {},
      });
    }

    const total = await prisma.employee.count({ where: { deletedAt: null } });
    console.log(
      `Seed employees done: created=${created}, updated=${updated}, active employees in DB=${total}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
