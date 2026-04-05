import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from 'generated/prisma/client';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Admin Seeding started...');

  // Clear existing permissions just to be clean for the newly defined CRUD matrix
  await prisma.permission.deleteMany();

  // 1. Create ADMIN role
  const adminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Full system access',
    },
  });

  // 1b. Create CRUD permissions per entity
  const entities = [
    { code: 'product', name: 'sản phẩm' },
    { code: 'category', name: 'danh mục' },
    { code: 'rbac', name: 'phân quyền (role/permission)' },
    { code: 'employee', name: 'nhân viên' },
    { code: 'customer', name: 'khách hàng' },
    { code: 'order', name: 'đơn hàng' },
    { code: 'attribute', name: 'thuộc tính' },
    { code: 'color', name: 'màu sắc' },
    { code: 'size', name: 'kích thước' },
  ];

  const actions = [
    { code: 'create', name: 'Thêm mới' },
    { code: 'read', name: 'Xem' },
    { code: 'update', name: 'Cập nhật' },
    { code: 'delete', name: 'Xoá' },
  ];

  // Generate the array of permissions based on the matrix
  const permissionsToSeed = entities.flatMap((entity) =>
    actions.map((action) => ({
      name: `${entity.code}.${action.code}`,
      description: `${action.name} ${entity.name}`,
    })),
  );

  for (const p of permissionsToSeed) {
    const perm = await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });

    // Map to Super Admin
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  // 3. Upsert admin employee
  const admin = await prisma.employee.upsert({
    where: { email: 'admin@vnmixx.com' },
    update: {
      hashedPassword, // update password in case it exists
    },
    create: {
      fullName: 'System Administrator',
      email: 'admin@vnmixx.com',
      phoneNumber: '0987654321', // Use a standard dummy phone to pass unique constraint
      hashedPassword,
      isActive: true,
    },
  });

  // 4. Assign role
  await prisma.employeeRole.upsert({
    where: {
      employeeId_roleId: {
        employeeId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      employeeId: admin.id,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Admin initialized successfully.');
  console.log(`Email: admin@vnmixx.com | Password: Admin@123`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error seeding admin', err);
  process.exit(1);
});
