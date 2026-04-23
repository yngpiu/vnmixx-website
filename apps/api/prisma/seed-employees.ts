import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { hash } from 'bcrypt';
import 'dotenv/config';
import { EmployeeStatus, PrismaClient } from '../generated/prisma/client';

const BCRYPT_ROUNDS = 10;

const seedPassword = () => process.env.SEED_EMPLOYEE_PASSWORD ?? '12345678';

function pravatarUrl(seed: string): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
}

const ROLE_DISTRIBUTION = [
  { role: 'Chủ cửa hàng', count: 2 },
  { role: 'Quản lý cửa hàng', count: 5 },
  { role: 'Thu ngân & tư vấn bán hàng', count: 25 },
  { role: 'Chuyên viên hàng hóa', count: 8 },
  { role: 'Kế toán / kiểm soát', count: 5 },
  { role: 'Phụ trách IT & nhân sự', count: 5 },
];

export async function seedEmployees(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await hash(seedPassword(), BCRYPT_ROUNDS);
    const roles = await prisma.role.findMany({ select: { id: true, name: true } });
    const roleIdByName = new Map(roles.map((r) => [r.name, r.id]));

    let created = 0;
    let updated = 0;

    faker.seed(123);

    let employeeIndex = 0;
    for (const dist of ROLE_DISTRIBUTION) {
      const roleId = roleIdByName.get(dist.role);
      if (roleId === undefined) {
        console.warn(
          `Bỏ qua phân quyền: không tìm thấy vai trò "${dist.role}" (chạy seed RBAC trước).`,
        );
        continue;
      }

      for (let i = 0; i < dist.count; i++) {
        const isMale = faker.datatype.boolean();
        const fullName = faker.person.fullName({ sex: isMale ? 'male' : 'female' });
        // Generate valid VN phone format 0[35789]xxxxxxxx
        const phonePrefix = faker.helpers.arrayElement(['03', '05', '07', '08', '09']);
        const phoneNumber = `${phonePrefix}${faker.string.numeric(8)}`;

        let email = '';
        if (employeeIndex === 0) {
          email = 'vnmixx@gmail.com'; // Keep admin email for dev testing
        } else {
          const emailName = faker.internet
            .username({ firstName: fullName.split(' ').pop(), lastName: fullName.split(' ')[0] })
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
          email = `${emailName}.emp${employeeIndex}@gmail.com`;
        }

        const existing = await prisma.employee.findUnique({ where: { email } });
        const avatarUrl = pravatarUrl(email);

        await prisma.employee.upsert({
          where: { email },
          create: {
            roleId,
            fullName,
            email,
            phoneNumber,
            hashedPassword,
            avatarUrl,
            status: EmployeeStatus.ACTIVE,
          },
          update: {
            roleId,
            fullName,
            phoneNumber,
            hashedPassword,
            avatarUrl,
            status: EmployeeStatus.ACTIVE,
            deletedAt: null,
          },
        });

        if (existing) updated += 1;
        else created += 1;

        employeeIndex++;
      }
    }

    const total = await prisma.employee.count({ where: { deletedAt: null } });
    console.log(
      `Seed employees done: created=${created}, updated=${updated}, active employees in DB=${total}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
