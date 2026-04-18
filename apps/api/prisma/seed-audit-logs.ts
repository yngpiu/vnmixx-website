import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import { AuditLogStatus, Prisma, PrismaClient } from '../generated/prisma/client';

const SEED_REQUEST_ID_PREFIX = 'seed-audit-';
const AUDIT_LOG_COUNT = 5000;

export async function seedAuditLogs(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true },
    });

    if (employees.length === 0) {
      console.log('Seed audit logs: không tìm thấy nhân viên, bỏ qua.');
      return;
    }

    await prisma.auditLog.deleteMany({
      where: { requestId: { startsWith: SEED_REQUEST_ID_PREFIX } },
    });

    faker.seed(777);

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const actions = [
      { action: 'product.update', type: 'product' },
      { action: 'product.create', type: 'product' },
      { action: 'order.update_status', type: 'order' },
      { action: 'order.cancel', type: 'order' },
      { action: 'customer.update', type: 'customer' },
      { action: 'role.update', type: 'role' },
      { action: 'employee.create', type: 'employee' },
      { action: 'category.update', type: 'category' },
    ];

    const logsToCreate: Prisma.AuditLogCreateManyInput[] = [];

    for (let i = 0; i < AUDIT_LOG_COUNT; i++) {
      const emp = faker.helpers.arrayElement(employees);
      const actionDef = faker.helpers.arrayElement(actions);

      let createdAt: Date;
      const r = faker.number.float({ min: 0, max: 1 });
      if (r < 0.3) {
        createdAt = faker.date.between({
          from: twoYearsAgo,
          to: new Date(twoYearsAgo.getTime() + 365 * 24 * 60 * 60 * 1000),
        });
      } else {
        createdAt = faker.date.between({
          from: new Date(twoYearsAgo.getTime() + 365 * 24 * 60 * 60 * 1000),
          to: new Date(),
        });
      }

      const isSuccess = faker.datatype.boolean({ probability: 0.95 });

      logsToCreate.push({
        actorEmployeeId: emp.id,
        action: actionDef.action,
        resourceType: actionDef.type,
        resourceId: String(faker.number.int({ min: 1, max: 1000 })),
        requestId: `${SEED_REQUEST_ID_PREFIX}${i.toString().padStart(5, '0')}`,
        ipAddress: faker.internet.ipv4(),
        userAgent: faker.internet.userAgent(),
        beforeData:
          isSuccess && actionDef.action.includes('update') ? { status: 'OLD' } : Prisma.JsonNull,
        afterData: isSuccess ? { status: 'NEW' } : Prisma.JsonNull,
        status: isSuccess ? AuditLogStatus.SUCCESS : AuditLogStatus.FAILED,
        errorMessage: isSuccess ? null : 'Lỗi xác thực quyền hoặc dữ liệu không hợp lệ',
        createdAt,
      });
    }

    logsToCreate.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());

    let created = 0;
    const BATCH_SIZE = 1000;
    for (let i = 0; i < logsToCreate.length; i += BATCH_SIZE) {
      const batch = logsToCreate.slice(i, i + BATCH_SIZE);
      await prisma.auditLog.createMany({ data: batch });
      created += batch.length;
    }

    console.log(`Seed audit logs done: ${created} rows.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedAuditLogs().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
