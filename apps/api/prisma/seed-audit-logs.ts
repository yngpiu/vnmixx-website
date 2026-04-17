import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import { AuditLogStatus, PrismaClient } from '../generated/prisma/client';

const SEED_REQUEST_ID_PREFIX = 'seed-audit-';

/**
 * Ghi vài dòng audit mẫu cho dev/demo. Idempotent: xóa theo requestId rồi tạo lại.
 * Chạy sau seed nhân viên (cần actor hợp lệ).
 */
export async function seedAuditLogs(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const admin = await prisma.employee.findFirst({
      where: { email: 'vnmixx@gmail.com', deletedAt: null },
      select: { id: true },
    });
    const manager = await prisma.employee.findFirst({
      where: { email: 'phamthuha.qlch@gmail.com', deletedAt: null },
      select: { id: true },
    });
    const itStaff = await prisma.employee.findFirst({
      where: { email: 'buiducthinh.itns@gmail.com', deletedAt: null },
      select: { id: true },
    });

    const primaryActorId = admin?.id ?? manager?.id ?? itStaff?.id;
    if (primaryActorId === undefined) {
      console.log('Seed audit logs: không tìm thấy nhân viên mẫu, bỏ qua.');
      return;
    }

    await prisma.auditLog.deleteMany({
      where: { requestId: { startsWith: SEED_REQUEST_ID_PREFIX } },
    });

    const firstOrder = await prisma.order.findFirst({
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    const firstProduct = await prisma.product.findFirst({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    const firstCategory = await prisma.category.findFirst({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    const now = Date.now();
    const hoursAgo = (h: number): Date => new Date(now - h * 60 * 60 * 1000);

    await prisma.auditLog.createMany({
      data: [
        {
          actorEmployeeId: primaryActorId,
          action: 'role.create',
          resourceType: 'role',
          resourceId: '99',
          requestId: `${SEED_REQUEST_ID_PREFIX}001`,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (demo seed)',
          beforeData: undefined,
          afterData: { name: 'Demo role', description: 'Vai trò demo chỉ dùng dev' },
          status: AuditLogStatus.SUCCESS,
          errorMessage: null,
          createdAt: hoursAgo(48),
        },
        {
          actorEmployeeId: itStaff?.id ?? primaryActorId,
          action: 'role.update',
          resourceType: 'role',
          resourceId: '2',
          requestId: `${SEED_REQUEST_ID_PREFIX}002`,
          ipAddress: '192.168.1.10',
          userAgent: 'Mozilla/5.0 (demo seed)',
          beforeData: { name: 'Quản lý cửa hàng' },
          afterData: { name: 'Quản lý cửa hàng', description: 'Cập nhật mô tả (seed)' },
          status: AuditLogStatus.SUCCESS,
          errorMessage: null,
          createdAt: hoursAgo(36),
        },
        {
          actorEmployeeId: manager?.id ?? primaryActorId,
          action: 'product.update',
          resourceType: 'product',
          resourceId: firstProduct ? String(firstProduct.id) : '1',
          requestId: `${SEED_REQUEST_ID_PREFIX}003`,
          ipAddress: '10.0.0.5',
          userAgent: 'Mozilla/5.0 (demo seed)',
          beforeData: { name: 'Before' },
          afterData: { name: 'After', isActive: true },
          status: AuditLogStatus.SUCCESS,
          errorMessage: null,
          createdAt: hoursAgo(24),
        },
        {
          actorEmployeeId: primaryActorId,
          action: 'category.create',
          resourceType: 'category',
          resourceId: firstCategory ? String(firstCategory.id) : '1',
          requestId: `${SEED_REQUEST_ID_PREFIX}004`,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (demo seed)',
          beforeData: undefined,
          afterData: { name: 'Danh mục seed', slug: 'danh-muc-seed' },
          status: AuditLogStatus.SUCCESS,
          errorMessage: null,
          createdAt: hoursAgo(12),
        },
        {
          actorEmployeeId: manager?.id ?? primaryActorId,
          action: 'order.confirm',
          resourceType: 'order',
          resourceId: firstOrder ? String(firstOrder.id) : '1',
          requestId: `${SEED_REQUEST_ID_PREFIX}005`,
          ipAddress: '172.16.0.2',
          userAgent: 'Mozilla/5.0 (demo seed)',
          beforeData: { status: 'PENDING' },
          afterData: { status: 'CONFIRMED' },
          status: AuditLogStatus.SUCCESS,
          errorMessage: null,
          createdAt: hoursAgo(6),
        },
        {
          actorEmployeeId: itStaff?.id ?? primaryActorId,
          action: 'role.update',
          resourceType: 'role',
          resourceId: '999',
          requestId: `${SEED_REQUEST_ID_PREFIX}006`,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (demo seed)',
          beforeData: undefined,
          afterData: { name: 'Không tồn tại' },
          status: AuditLogStatus.FAILED,
          errorMessage: 'Không tìm thấy vai trò #999',
          createdAt: hoursAgo(2),
        },
        {
          actorEmployeeId: primaryActorId,
          action: 'employee.create',
          resourceType: 'employee',
          resourceId: '42',
          requestId: `${SEED_REQUEST_ID_PREFIX}007`,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (demo seed)',
          beforeData: undefined,
          afterData: { email: 'new.user@example.com', fullName: 'User Seed' },
          status: AuditLogStatus.SUCCESS,
          errorMessage: null,
          createdAt: hoursAgo(1),
        },
      ],
    });

    const inserted = await prisma.auditLog.count({
      where: { requestId: { startsWith: SEED_REQUEST_ID_PREFIX } },
    });
    console.log(
      `Seed audit logs done: ${inserted} rows (requestId prefix ${SEED_REQUEST_ID_PREFIX}*)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
