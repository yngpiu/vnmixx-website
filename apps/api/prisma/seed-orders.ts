import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  StockMovementType,
} from '../generated/prisma/client';

/** Tổng số đơn seed (~3 năm, phân bổ đều theo tháng rồi ngẫu nhiên trong ngày). */
const ORDER_COUNT = 3200;

/** Mốc cuối kỳ seed: 17/04/2026 (UTC). Khoảng 3 năm về trước từ mốc này. */
const SEED_RANGE_END = new Date(Date.UTC(2026, 3, 17, 23, 59, 59, 999));

/** Mốc đầu kỳ: 17/04/2023 (UTC) — đúng 3 năm lịch so với ngày cuối. */
const SEED_RANGE_START = new Date(Date.UTC(2023, 3, 17, 0, 0, 0, 0));

type DateWindow = { readonly start: Date; readonly end: Date };

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomWeightedPick<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    if (r < weights[i]) return items[i];
    r -= weights[i];
  }
  return items[0];
}

function randomDateBetweenInclusive(start: Date, end: Date): Date {
  const a = start.getTime();
  const b = end.getTime();
  if (a >= b) {
    return new Date(a);
  }
  return new Date(a + Math.floor(Math.random() * (b - a + 1)));
}

/**
 * Các cửa sổ theo tháng dương lịch trong [rangeStart, rangeEnd] (cắt đầu/cuối tháng đầu/cuối).
 * Đảm bảo mỗi tháng có vùng thời gian hợp lệ để phân bổ đơn theo năm/tháng/ngày.
 */
function buildMonthWindows(rangeStart: Date, rangeEnd: Date): DateWindow[] {
  const out: DateWindow[] = [];
  let y = rangeStart.getUTCFullYear();
  let mo = rangeStart.getUTCMonth();
  const endMs = rangeEnd.getTime();
  for (;;) {
    const monthStart = new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0));
    const lastDayOfMonth = new Date(Date.UTC(y, mo + 1, 0, 23, 59, 59, 999));
    const winStart = new Date(Math.max(monthStart.getTime(), rangeStart.getTime()));
    const winEnd = new Date(Math.min(lastDayOfMonth.getTime(), rangeEnd.getTime()));
    if (winStart.getTime() <= winEnd.getTime()) {
      out.push({ start: winStart, end: winEnd });
    }
    if (lastDayOfMonth.getTime() >= endMs) {
      break;
    }
    mo += 1;
    if (mo > 11) {
      mo = 0;
      y += 1;
    }
    if (new Date(Date.UTC(y, mo, 1)).getTime() > endMs) {
      break;
    }
  }
  return out;
}

/** Mã đơn tối đa 20 ký tự, duy nhất theo thứ tự seed. */
function nextSeedOrderCode(createdAt: Date, seq: number): string {
  const yy = String(createdAt.getUTCFullYear()).slice(2);
  const mm = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(createdAt.getUTCDate()).padStart(2, '0');
  const tail = seq.toString(36).toUpperCase().padStart(5, '0').slice(-5);
  return `S${yy}${mm}${dd}${tail}`.slice(0, 20);
}

function clampTime(t: number, min: number, max: number): number {
  return Math.min(Math.max(t, min), max);
}

function buildStatusTimeline(
  status: OrderStatus,
  orderCreatedAt: Date,
  windowEnd: Date,
): { histories: { status: OrderStatus; createdAt: Date }[]; orderUpdatedAt: Date } {
  const t0 = orderCreatedAt.getTime();
  const cap = windowEnd.getTime();
  const histories: { status: OrderStatus; createdAt: Date }[] = [];
  const addHours = (base: number, hMin: number, hMax: number): number => {
    return clampTime(base + randomInt(hMin, hMax) * 3600_000, t0, cap);
  };
  const addDays = (base: number, dMin: number, dMax: number): number => {
    return clampTime(base + randomInt(dMin, dMax) * 86_400_000, t0, cap);
  };
  if (status === OrderStatus.PENDING) {
    histories.push({ status: OrderStatus.PENDING, createdAt: new Date(t0) });
    return { histories, orderUpdatedAt: new Date(addHours(t0, 1, 12)) };
  }
  if (status === OrderStatus.CANCELLED) {
    const tP = t0;
    const tC = addDays(tP, 0, 3);
    histories.push({ status: OrderStatus.PENDING, createdAt: new Date(tP) });
    histories.push({ status: OrderStatus.CANCELLED, createdAt: new Date(tC) });
    return { histories, orderUpdatedAt: new Date(tC) };
  }
  histories.push({ status: OrderStatus.PENDING, createdAt: new Date(t0) });
  const tProc = addHours(t0, 2, 48);
  histories.push({ status: OrderStatus.PROCESSING, createdAt: new Date(tProc) });
  if (status === OrderStatus.PROCESSING) {
    return { histories, orderUpdatedAt: new Date(tProc) };
  }
  if (status === OrderStatus.SHIPPED) {
    const tShip = addDays(tProc, 1, 5);
    histories.push({ status: OrderStatus.SHIPPED, createdAt: new Date(tShip) });
    return { histories, orderUpdatedAt: new Date(tShip) };
  }
  if (status === OrderStatus.DELIVERED) {
    const tShip = addDays(tProc, 1, 5);
    const tDel = addDays(tShip, 1, 7);
    histories.push({ status: OrderStatus.SHIPPED, createdAt: new Date(tShip) });
    histories.push({ status: OrderStatus.DELIVERED, createdAt: new Date(tDel) });
    return { histories, orderUpdatedAt: new Date(tDel) };
  }
  histories.push({ status: OrderStatus.PENDING, createdAt: new Date(t0) });
  return { histories, orderUpdatedAt: new Date(t0) };
}

function paymentPaidAt(
  paymentStatus: PaymentStatus,
  orderCreatedAt: Date,
  histories: { status: OrderStatus; createdAt: Date }[],
): Date | null {
  if (paymentStatus !== PaymentStatus.SUCCESS) {
    return null;
  }
  const proc = histories.find((h) => h.status === OrderStatus.PROCESSING);
  const base = proc?.createdAt ?? orderCreatedAt;
  return new Date(base.getTime() + randomInt(1, 24) * 3600_000);
}

async function wipeSeedOrders(prisma: PrismaClient): Promise<void> {
  await prisma.stockMovement.deleteMany({ where: { orderId: { not: null } } });
  await prisma.payment.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
}

export async function seedOrders(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    await wipeSeedOrders(prisma);
    console.log('Cleared existing order data.');

    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      take: 100,
    });

    if (customers.length === 0) {
      console.log('No customers found. Run seedCustomers first.');
      return;
    }

    const variants = await prisma.productVariant.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        product: true,
        color: true,
        size: true,
      },
    });

    if (variants.length === 0) {
      console.log('No variants found. Run seedProducts first.');
      return;
    }

    const wards = await prisma.ward.findMany({
      take: 100,
      include: {
        district: {
          include: {
            city: true,
          },
        },
      },
    });

    if (wards.length === 0) {
      console.log('No locations found. Run seedLocations first.');
    }

    const monthWindows = buildMonthWindows(SEED_RANGE_START, SEED_RANGE_END);
    if (monthWindows.length === 0) {
      throw new Error('Không tạo được cửa sổ tháng cho khoảng seed đơn hàng.');
    }

    const basePerMonth = Math.floor(ORDER_COUNT / monthWindows.length);
    let extraOrders = ORDER_COUNT - basePerMonth * monthWindows.length;
    console.log(
      `Seeding ${ORDER_COUNT} orders across ${monthWindows.length} month buckets (${SEED_RANGE_START.toISOString().slice(0, 10)} → ${SEED_RANGE_END.toISOString().slice(0, 10)}).`,
    );

    let orderSeq = 0;
    for (let wi = 0; wi < monthWindows.length; wi++) {
      const w = monthWindows[wi];
      const countThisMonth = basePerMonth + (extraOrders > 0 ? 1 : 0);
      if (extraOrders > 0) {
        extraOrders -= 1;
      }
      for (let k = 0; k < countThisMonth; k++) {
        orderSeq += 1;
        const customer = randomPick(customers);
        const itemCount = randomInt(1, 4);
        const selectedVariants: (typeof variants)[number][] = [];
        for (let j = 0; j < itemCount; j++) {
          selectedVariants.push(randomPick(variants));
        }

        const status = randomWeightedPick(
          [
            OrderStatus.DELIVERED,
            OrderStatus.SHIPPED,
            OrderStatus.PROCESSING,
            OrderStatus.PENDING,
            OrderStatus.CANCELLED,
          ],
          [60, 15, 10, 10, 5],
        );

        const paymentMethod = randomPick([PaymentMethod.COD, PaymentMethod.BANK_TRANSFER]);
        const paymentStatus =
          status === OrderStatus.DELIVERED || status === OrderStatus.SHIPPED
            ? PaymentStatus.SUCCESS
            : status === OrderStatus.CANCELLED
              ? PaymentStatus.FAILED
              : PaymentStatus.PENDING;

        const ward = wards.length > 0 ? randomPick(wards) : null;

        const shippingInfo = {
          shippingFullName: customer.fullName,
          shippingPhoneNumber: customer.phoneNumber,
          shippingCity: ward?.district.city.name ?? 'TP. Hồ Chí Minh',
          shippingDistrict: ward?.district.name ?? 'Quận 1',
          shippingWard: ward?.name ?? 'Phường Bến Nghé',
          shippingAddressLine: `${randomInt(1, 999)} Đường ${randomPick(['Lê Lợi', 'Nguyễn Huệ', 'Cách Mạng Tháng 8', 'Lý Tự Trọng'])}`,
          shippingGhnDistrictId: ward ? Number(ward.district.giaohangnhanhId) : 1442,
          shippingGhnWardCode: ward?.giaohangnhanhId ?? '20101',
        };

        const orderCreatedAt = randomDateBetweenInclusive(w.start, w.end);
        const orderCode = nextSeedOrderCode(orderCreatedAt, orderSeq);
        const { histories: statusHistories, orderUpdatedAt } = buildStatusTimeline(
          status,
          orderCreatedAt,
          SEED_RANGE_END,
        );
        const paidAt = paymentPaidAt(paymentStatus, orderCreatedAt, statusHistories);
        const stockEventAt =
          status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED
            ? (statusHistories.find((h) => h.status === OrderStatus.SHIPPED)?.createdAt ??
              orderUpdatedAt)
            : new Date(orderCreatedAt.getTime() + 86_400_000);

        let subtotal = 0;
        const orderItemsData = selectedVariants.map((v) => {
          const qty = randomInt(1, 2);
          const itemSubtotal = v.price * qty;
          subtotal += itemSubtotal;
          return {
            variantId: v.id,
            productName: v.product.name,
            colorName: v.color.name,
            sizeLabel: v.size.label,
            sku: v.sku,
            price: v.price,
            quantity: qty,
            subtotal: itemSubtotal,
          };
        });

        const shippingFee = randomInt(20, 50) * 1000;
        const total = subtotal + shippingFee;

        await prisma.$transaction(async (tx) => {
          const order = await tx.order.create({
            data: {
              orderCode,
              customerId: customer.id,
              status,
              ...shippingInfo,
              paymentStatus,
              subtotal,
              shippingFee,
              total,
              createdAt: orderCreatedAt,
              updatedAt: orderUpdatedAt,
              items: {
                create: orderItemsData.map((row) => ({
                  ...row,
                  createdAt: orderCreatedAt,
                })),
              },
              statusHistories: {
                create: statusHistories.map((h) => ({
                  status: h.status,
                  createdAt: h.createdAt,
                })),
              },
              payments: {
                create: [
                  {
                    method: paymentMethod,
                    status: paymentStatus,
                    amount: total,
                    paidAt,
                    createdAt: orderCreatedAt,
                    updatedAt: paidAt ?? orderUpdatedAt,
                    transactionId:
                      paymentMethod === PaymentMethod.BANK_TRANSFER ? `TXN-${orderCode}` : null,
                  },
                ],
              },
            },
            include: {
              items: true,
            },
          });

          for (const item of order.items) {
            const variant = variants.find((v) => v.id === item.variantId);
            const onHandBefore = variant?.onHand ?? 100;
            const onHandAfter = onHandBefore - item.quantity;

            await tx.stockMovement.create({
              data: {
                variantId: item.variantId,
                orderId: order.id,
                orderItemId: item.id,
                type: StockMovementType.EXPORT,
                delta: -item.quantity,
                onHandAfter: onHandAfter < 0 ? 0 : onHandAfter,
                reservedAfter: 0,
                note: `Xuất kho cho đơn hàng ${orderCode}`,
                createdAt: stockEventAt,
              },
            });
          }
        });

        if (orderSeq % 200 === 0) {
          console.log(`Created ${orderSeq} orders...`);
        }
      }
    }

    console.log(`Seed orders done: ${orderSeq} orders created (${monthWindows.length} months).`);
  } finally {
    await prisma.$disconnect();
  }
}
