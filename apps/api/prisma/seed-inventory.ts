import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  InventoryMovementType,
  InventoryVoucherType,
  PrismaClient,
} from '../generated/prisma/client';
import { SEED_CONFIG } from './seed-constants';
import { clampDate, resolveSeedAsOfDate, yearsBefore } from './seed-date-range';

const SEED_VOUCHER_PREFIX = 'SEED-INV-';
const VOUCHER_COUNT = SEED_CONFIG.inventoryVoucherCount;

async function wipeSeedInventoryVouchers(prisma: PrismaClient): Promise<void> {
  await prisma.inventoryMovement.deleteMany({
    where: { voucher: { code: { startsWith: SEED_VOUCHER_PREFIX } } },
  });
  await prisma.inventoryVoucher.deleteMany({
    where: { code: { startsWith: SEED_VOUCHER_PREFIX } },
  });
}

export async function seedInventory(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });
  try {
    await wipeSeedInventoryVouchers(prisma);
    const [employees, variantIds] = await Promise.all([
      prisma.employee.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
        take: 50,
      }),
      prisma.productVariant.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true },
      }),
    ]);
    if (employees.length === 0 || variantIds.length === 0) {
      console.log('Seed inventory: bỏ qua (thiếu employee hoặc variant).');
      return;
    }
    const asOf = resolveSeedAsOfDate();
    const rangeStart = yearsBefore(asOf, 3);
    faker.seed(20260428);
    let seq = 0;
    let created = 0;
    for (let i = 0; i < VOUCHER_COUNT; i += 1) {
      const issuedAt = clampDate(
        faker.date.between({ from: rangeStart, to: asOf }),
        rangeStart,
        asOf,
      );
      const type: InventoryVoucherType = faker.datatype.boolean({ probability: 0.55 })
        ? InventoryVoucherType.IMPORT
        : InventoryVoucherType.EXPORT;
      const variantId = faker.helpers.arrayElement(variantIds).id;
      const fresh = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
        select: { id: true, onHand: true, reserved: true, version: true },
      });
      const available = Math.max(0, fresh.onHand - fresh.reserved);
      const quantity =
        type === InventoryVoucherType.IMPORT
          ? faker.number.int({ min: 5, max: 45 })
          : faker.number.int({ min: 1, max: Math.min(12, Math.max(1, available)) });
      if (type === InventoryVoucherType.EXPORT && quantity > available) {
        continue;
      }
      const unitPrice =
        type === InventoryVoucherType.IMPORT ? faker.number.int({ min: 0, max: 280_000 }) : 0;
      seq += 1;
      const datePart = `${issuedAt.getUTCFullYear()}${String(issuedAt.getUTCMonth() + 1).padStart(2, '0')}${String(issuedAt.getUTCDate()).padStart(2, '0')}`;
      const code = `${SEED_VOUCHER_PREFIX}${datePart}-${String(seq).padStart(4, '0')}`;
      const employeeId = faker.helpers.arrayElement(employees).id;
      const movementType =
        type === InventoryVoucherType.IMPORT
          ? InventoryMovementType.IMPORT
          : InventoryMovementType.EXPORT;
      const nextOnHand =
        type === InventoryVoucherType.IMPORT ? fresh.onHand + quantity : fresh.onHand - quantity;
      if (nextOnHand < 0) {
        continue;
      }
      const totalAmount = quantity * unitPrice;
      try {
        await prisma.$transaction(async (tx) => {
          const existed = await tx.inventoryVoucher.findUnique({
            where: { code },
            select: { id: true },
          });
          if (existed) {
            return;
          }
          const voucher = await tx.inventoryVoucher.create({
            data: {
              code,
              type,
              issuedAt,
              note:
                type === InventoryVoucherType.IMPORT ? 'Seed nhập kho demo' : 'Seed xuất kho demo',
              totalQuantity: quantity,
              totalAmount,
              createdByEmployeeId: employeeId,
              createdAt: issuedAt,
              updatedAt: issuedAt,
            },
          });
          const updated = await tx.productVariant.updateMany({
            where: { id: fresh.id, version: fresh.version },
            data: {
              onHand: nextOnHand,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) {
            throw new Error('version conflict');
          }
          await tx.inventoryVoucherItem.create({
            data: {
              voucherId: voucher.id,
              variantId: fresh.id,
              quantity,
              unitPrice,
              lineAmount: totalAmount,
              createdAt: issuedAt,
              updatedAt: issuedAt,
            },
          });
          await tx.inventoryMovement.create({
            data: {
              variantId: fresh.id,
              voucherId: voucher.id,
              employeeId,
              type: movementType,
              delta: type === InventoryVoucherType.IMPORT ? quantity : -quantity,
              onHandAfter: nextOnHand,
              reservedAfter: fresh.reserved,
              note: `Seed phiếu ${code}`,
              createdAt: issuedAt,
            },
          });
        });
        created += 1;
      } catch {
        /* trùng mã hoặc xung đột version — bỏ qua */
      }
    }
    console.log(
      `Seed inventory done: ${created} phiếu (${SEED_VOUCHER_PREFIX}*, mục tiêu ${VOUCHER_COUNT}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
