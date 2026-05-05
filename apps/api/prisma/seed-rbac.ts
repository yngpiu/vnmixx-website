import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

function crud(
  resource: string,
  descriptions: { create: string; read: string; update: string; delete: string },
): { name: string; description: string }[] {
  return [
    { name: `${resource}.create`, description: descriptions.create },
    { name: `${resource}.read`, description: descriptions.read },
    { name: `${resource}.update`, description: descriptions.update },
    { name: `${resource}.delete`, description: descriptions.delete },
  ];
}

const PERMISSIONS: { name: string; description: string }[] = [
  { name: 'audit.read', description: 'Audit log: xem lịch sử thao tác quản trị' },
  ...crud('rbac', {
    create: 'RBAC: tạo vai trò',
    read: 'RBAC: xem vai trò, quyền, gán vai trò nhân viên',
    update: 'RBAC: sửa vai trò, đồng bộ quyền / vai trò nhân viên',
    delete: 'RBAC: xóa vai trò',
  }),
  ...crud('order', {
    create: 'Đơn hàng: tạo',
    read: 'Đơn hàng: xem',
    update: 'Đơn hàng: cập nhật',
    delete: 'Đơn hàng: xóa / hủy',
  }),
  ...crud('customer', {
    create: 'Khách hàng: tạo',
    read: 'Khách hàng: xem',
    update: 'Khách hàng: cập nhật',
    delete: 'Khách hàng: xóa',
  }),
  ...crud('employee', {
    create: 'Nhân viên: tạo',
    read: 'Nhân viên: xem',
    update: 'Nhân viên: cập nhật',
    delete: 'Nhân viên: xóa',
  }),
  ...crud('product', {
    create: 'Sản phẩm: tạo',
    read: 'Sản phẩm: xem',
    update: 'Sản phẩm: cập nhật',
    delete: 'Sản phẩm: xóa / ẩn',
  }),
  ...crud('category', {
    create: 'Danh mục: tạo',
    read: 'Danh mục: xem',
    update: 'Danh mục: cập nhật',
    delete: 'Danh mục: xóa',
  }),
  ...crud('color', {
    create: 'Màu: tạo',
    read: 'Màu: xem',
    update: 'Màu: cập nhật',
    delete: 'Màu: xóa',
  }),
  ...crud('size', {
    create: 'Cỡ: tạo',
    read: 'Cỡ: xem',
    update: 'Cỡ: cập nhật',
    delete: 'Cỡ: xóa',
  }),
  ...crud('review', {
    create: 'Đánh giá: tạo',
    read: 'Đánh giá: xem',
    update: 'Đánh giá: cập nhật',
    delete: 'Đánh giá: xóa',
  }),
  ...crud('inventory', {
    create: 'Kho: tạo phiếu nhập/xuất và ghi nhận biến động tồn',
    read: 'Kho: xem tồn kho, lịch sử biến động, danh sách/chi tiết phiếu',
    update: 'Kho: cập nhật dữ liệu kho (dành cho luồng mở rộng)',
    delete: 'Kho: xóa dữ liệu kho (dành cho luồng mở rộng)',
  }),
  { name: 'support-chat.read', description: 'Chat hỗ trợ: xem danh sách và tin nhắn' },
  { name: 'support-chat.create', description: 'Chat hỗ trợ: nhận phân công và gửi tin nhắn' },
];

type RoleSeed = {
  name: string;
  description: string;
  permissionNames: string[];
};

const ROLES: RoleSeed[] = [
  {
    name: 'Chủ cửa hàng',
    description:
      'Giống vai trò chủ doanh nghiệp: toàn bộ nghiệp vụ, phân quyền và quản lý tài khoản nhân viên trong hệ thống.',
    permissionNames: PERMISSIONS.map((p) => p.name),
  },
  {
    name: 'Quản lý cửa hàng',
    description:
      'Điều hành vận hành hằng ngày — đơn, khách, hàng hóa, nhân viên; không chỉnh cấu trúc vai trò/quyền hệ thống.',
    permissionNames: PERMISSIONS.filter((p) => !p.name.startsWith('rbac.')).map((p) => p.name),
  },
  {
    name: 'Thu ngân & tư vấn bán hàng',
    description:
      'Lên đơn, chăm sóc khách, xử lý theo quy trình cửa hàng; được xem danh mục để tư vấn, không sửa master dữ liệu hàng.',
    permissionNames: PERMISSIONS.filter(
      (p) =>
        /^(order|customer|review|support-chat)\./.test(p.name) ||
        /^(product|category|color|size)\.read$/.test(p.name),
    ).map((p) => p.name),
  },
  {
    name: 'Chuyên viên hàng hóa',
    description:
      'Merchandising: giá, ảnh, mô tả, SKU, nhóm màu–size và danh mục; không đụng đến phân quyền.',
    permissionNames: PERMISSIONS.filter((p) =>
      /^(product|category|color|size|review)\./.test(p.name),
    ).map((p) => p.name),
  },
  {
    name: 'Kế toán / kiểm soát',
    description:
      'Chỉ đọc dữ liệu để đối soát, báo cáo; không thao tác nghiệp vụ bán hay chỉnh master data.',
    permissionNames: PERMISSIONS.filter((p) => p.name.endsWith('.read')).map((p) => p.name),
  },
  {
    name: 'Phụ trách IT & nhân sự',
    description:
      'Tạo tài khoản nhân viên, gán vai trò và quyền; phù hợp người phụ trách hệ thống hoặc HR không cần thao tác đơn/hàng.',
    permissionNames: PERMISSIONS.filter(
      (p) =>
        p.name.startsWith('rbac.') || p.name.startsWith('employee.') || p.name === 'audit.read',
    ).map((p) => p.name),
  },
];

export async function seedRbac(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.permission.deleteMany({
      where: { name: { startsWith: 'attribute.' } },
    });

    await prisma.permission.createMany({
      data: PERMISSIONS.map(({ name, description }) => ({ name, description })),
      skipDuplicates: true,
    });

    const permissionRows = await prisma.permission.findMany({
      where: { name: { in: PERMISSIONS.map((p) => p.name) } },
      select: { id: true, name: true },
    });
    const permissionIdByName = new Map(permissionRows.map((row) => [row.name, row.id]));

    for (const def of ROLES) {
      const role = await prisma.role.upsert({
        where: { name: def.name },
        create: { name: def.name, description: def.description },
        update: { description: def.description },
      });

      const permissionIds = def.permissionNames
        .map((n) => permissionIdByName.get(n))
        .filter((id): id is number => id !== undefined);

      await prisma.$transaction([
        prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
        prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        }),
      ]);
    }

    const [permCount, roleCount] = await Promise.all([
      prisma.permission.count(),
      prisma.role.count(),
    ]);

    console.log(
      `Seed RBAC done: permissions (seed set)=${permissionRows.length}, total in DB=${permCount}, roles=${roleCount}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
