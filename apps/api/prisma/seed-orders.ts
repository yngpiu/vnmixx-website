import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  StockMovementType,
} from '../generated/prisma/client';

const ORDER_COUNT = 15000;

function generateOrderDates(twoYearsAgo: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < ORDER_COUNT; i++) {
    let date: Date;
    const r = faker.number.float({ min: 0, max: 1 });
    if (r < 0.2) {
      date = faker.date.between({
        from: twoYearsAgo,
        to: new Date(twoYearsAgo.getTime() + 365 * 24 * 60 * 60 * 1000),
      });
    } else if (r < 0.5) {
      date = faker.date.between({
        from: new Date(twoYearsAgo.getTime() + 365 * 24 * 60 * 60 * 1000),
        to: new Date(twoYearsAgo.getTime() + 547 * 24 * 60 * 60 * 1000),
      });
    } else {
      date = faker.date.between({
        from: new Date(twoYearsAgo.getTime() + 547 * 24 * 60 * 60 * 1000),
        to: new Date(),
      });
    }

    if (faker.datatype.boolean({ probability: 0.3 })) {
      const peakMonth = faker.helpers.arrayElement([0, 1, 10, 11]); // Jan, Feb (Tet), Nov, Dec
      date.setMonth(peakMonth);
    }
    dates.push(date);
  }
  return dates.sort((a, b) => a.getTime() - b.getTime());
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
      select: { id: true, fullName: true, phoneNumber: true },
    });

    if (customers.length === 0) {
      console.log('No customers found. Run seedCustomers first.');
      return;
    }

    const variants = await prisma.productVariant.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        product: { select: { name: true } },
        color: { select: { name: true } },
        size: { select: { label: true } },
      },
    });

    if (variants.length === 0) {
      console.log('No variants found. Run seedProducts first.');
      return;
    }

    const wards = await prisma.ward.findMany({
      include: { district: { include: { city: true } } },
    });

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    faker.seed(321);
    const sortedDates = generateOrderDates(twoYearsAgo);

    console.log(`Seeding ${ORDER_COUNT} orders...`);

    let orderSeq = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < ORDER_COUNT; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, ORDER_COUNT);

      await prisma.$transaction(async (tx) => {
        for (let k = i; k < batchEnd; k++) {
          orderSeq += 1;
          const orderCreatedAt = sortedDates[k];
          const customer = faker.helpers.arrayElement(customers);
          const itemCount = faker.number.int({ min: 1, max: 4 });
          const selectedVariants = faker.helpers.arrayElements(variants, itemCount);

          const statusWeights = [
            { status: OrderStatus.DELIVERED, weight: 70 },
            { status: OrderStatus.SHIPPED, weight: 10 },
            { status: OrderStatus.PROCESSING, weight: 5 },
            { status: OrderStatus.PENDING, weight: 5 },
            { status: OrderStatus.CANCELLED, weight: 10 },
            { status: OrderStatus.RETURNED, weight: 2 },
          ];

          let sum = 0;
          const r = Math.random() * 102; // sum of weights
          let status: OrderStatus = OrderStatus.DELIVERED;
          for (const sw of statusWeights) {
            sum += sw.weight;
            if (r <= sum) {
              status = sw.status;
              break;
            }
          }

          const paymentMethod = faker.datatype.boolean({ probability: 0.8 })
            ? PaymentMethod.COD
            : PaymentMethod.BANK_TRANSFER;
          const paymentStatus =
            status === OrderStatus.DELIVERED || status === OrderStatus.SHIPPED
              ? PaymentStatus.SUCCESS
              : status === OrderStatus.CANCELLED
                ? PaymentStatus.FAILED
                : PaymentStatus.PENDING;
          const ward = wards.length > 0 ? faker.helpers.arrayElement(wards) : null;

          const yy = String(orderCreatedAt.getUTCFullYear()).slice(2);
          const mm = String(orderCreatedAt.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(orderCreatedAt.getUTCDate()).padStart(2, '0');
          const orderCode = `S${yy}${mm}${dd}${orderSeq.toString(36).toUpperCase().padStart(5, '0').slice(-5)}`;

          let subtotal = 0;
          const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = selectedVariants.map(
            (v) => {
              const qty = faker.number.int({ min: 1, max: 3 });
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
                createdAt: orderCreatedAt,
              };
            },
          );

          const shippingFee = faker.helpers.arrayElement([20000, 30000, 40000, 50000]);
          const total = subtotal + shippingFee;

          const histories: Prisma.OrderStatusHistoryCreateManyOrderInput[] = [
            { status: OrderStatus.PENDING, createdAt: orderCreatedAt },
          ];
          let orderUpdatedAt = orderCreatedAt;

          if (status !== OrderStatus.PENDING) {
            if (status === OrderStatus.CANCELLED) {
              orderUpdatedAt = new Date(
                orderCreatedAt.getTime() + faker.number.int({ min: 1, max: 72 }) * 3600000,
              );
              histories.push({ status: OrderStatus.CANCELLED, createdAt: orderUpdatedAt });
            } else {
              const procTime = new Date(
                orderCreatedAt.getTime() + faker.number.int({ min: 1, max: 24 }) * 3600000,
              );
              histories.push({ status: OrderStatus.PROCESSING, createdAt: procTime });
              orderUpdatedAt = procTime;

              if (
                status === OrderStatus.SHIPPED ||
                status === OrderStatus.DELIVERED ||
                status === OrderStatus.RETURNED
              ) {
                const shipTime = new Date(
                  procTime.getTime() + faker.number.int({ min: 12, max: 72 }) * 3600000,
                );
                histories.push({ status: OrderStatus.SHIPPED, createdAt: shipTime });
                orderUpdatedAt = shipTime;

                if (status === OrderStatus.DELIVERED || status === OrderStatus.RETURNED) {
                  const delTime = new Date(
                    shipTime.getTime() + faker.number.int({ min: 24, max: 96 }) * 3600000,
                  );
                  histories.push({ status: OrderStatus.DELIVERED, createdAt: delTime });
                  orderUpdatedAt = delTime;

                  if (status === OrderStatus.RETURNED) {
                    const retTime = new Date(
                      delTime.getTime() + faker.number.int({ min: 24, max: 168 }) * 3600000,
                    );
                    histories.push({ status: OrderStatus.RETURNED, createdAt: retTime });
                    orderUpdatedAt = retTime;
                  }
                }
              }
            }
          }

          const paidAt = paymentStatus === PaymentStatus.SUCCESS ? orderUpdatedAt : null;

          const order = await tx.order.create({
            data: {
              orderCode,
              customerId: customer.id,
              status,
              shippingFullName: customer.fullName,
              shippingPhoneNumber: customer.phoneNumber,
              shippingCity: ward?.district.city.name ?? 'Hà Nội',
              shippingDistrict: ward?.district.name ?? 'Quận Đống Đa',
              shippingWard: ward?.name ?? 'Phường Láng Hạ',
              shippingAddressLine: `${faker.number.int({ min: 1, max: 999 })} Đường ${faker.helpers.arrayElement(['Thái Hà', 'Giảng Võ', 'Tôn Đức Thắng', 'Chùa Bộc'])}`,
              subtotal,
              shippingFee,
              total,
              createdAt: orderCreatedAt,
              updatedAt: orderUpdatedAt,
              items: { create: orderItemsData },
              statusHistories: { create: histories },
              payments: {
                create: [
                  {
                    method: paymentMethod,
                    status: paymentStatus,
                    amount: total,
                    paidAt,
                    transactionId:
                      paymentMethod === PaymentMethod.BANK_TRANSFER &&
                      paymentStatus === PaymentStatus.SUCCESS
                        ? `TXN-${orderCode}`
                        : null,
                    createdAt: orderCreatedAt,
                    updatedAt: paidAt ?? orderUpdatedAt,
                  },
                ],
              },
            },
            include: { items: true },
          });

          if (status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED) {
            const stockEventAt =
              histories.find((h) => h.status === OrderStatus.SHIPPED)?.createdAt ?? orderUpdatedAt;
            for (const item of order.items) {
              const variant = variants.find((v) => v.id === item.variantId);
              const onHandAfter = Math.max(0, (variant?.onHand ?? 100) - item.quantity);
              await tx.stockMovement.create({
                data: {
                  variantId: item.variantId,
                  orderId: order.id,
                  orderItemId: item.id,
                  type: StockMovementType.EXPORT,
                  delta: -item.quantity,
                  onHandAfter,
                  reservedAfter: 0,
                  note: `Xuất kho đơn hàng ${orderCode}`,
                  createdAt: stockEventAt,
                },
              });
            }
          }
        }
      });
      console.log(`Created ${Math.min(i + BATCH_SIZE, ORDER_COUNT)} orders...`);
    }

    console.log(`Seed orders done: ${ORDER_COUNT} orders created.`);
  } finally {
    await prisma.$disconnect();
  }
}
