import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  StockMovementType,
} from '../generated/prisma/client';

const ORDER_COUNT = 1000;

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

async function wipeSeedOrders(prisma: PrismaClient): Promise<void> {
  // Clear related tables in correct order to respect FKs
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
      // Fallback to dummy strings if locations are not seeded
    }

    console.log(`Starting to seed ${ORDER_COUNT} orders...`);

    for (let i = 0; i < ORDER_COUNT; i++) {
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

      const orderCode = `ORD-${Date.now() % 10000000}-${String(i).padStart(4, '0')}`;

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
            items: {
              create: orderItemsData,
            },
            statusHistories: {
              create: [
                { status: OrderStatus.PENDING, createdAt: new Date(Date.now() - 86400000 * 2) },
                ...(status !== OrderStatus.PENDING
                  ? [{ status: OrderStatus.PROCESSING, createdAt: new Date(Date.now() - 86400000) }]
                  : []),
                ...(status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED
                  ? [{ status: OrderStatus.SHIPPED, createdAt: new Date(Date.now() - 43200000) }]
                  : []),
                ...(status === OrderStatus.DELIVERED
                  ? [{ status: OrderStatus.DELIVERED, createdAt: new Date() }]
                  : []),
              ],
            },
            payments: {
              create: [
                {
                  method: paymentMethod,
                  status: paymentStatus,
                  amount: total,
                  paidAt: paymentStatus === PaymentStatus.SUCCESS ? new Date() : null,
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

        // Seed stock movements for each item
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
            },
          });
        }
      });

      if ((i + 1) % 100 === 0) {
        console.log(`Created ${i + 1} orders...`);
      }
    }

    console.log(`Seed orders done: ${ORDER_COUNT} orders created.`);
  } finally {
    await prisma.$disconnect();
  }
}
