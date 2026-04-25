import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  StockMovementType,
} from '../generated/prisma/client';

const ORDER_COUNT = Number(process.env.SEED_ORDER_COUNT ?? 1000);

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
  await prisma.sepayTransaction.deleteMany({});
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
    const BATCH_SIZE = 100;

    for (let i = 0; i < ORDER_COUNT; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, ORDER_COUNT);

      await prisma.$transaction(
        async (tx) => {
          for (let k = i; k < batchEnd; k++) {
            orderSeq += 1;
            const orderCreatedAt = sortedDates[k];
            const customer = faker.helpers.arrayElement(customers);
            const itemCount = faker.number.int({ min: 1, max: 4 });
            const selectedVariants = faker.helpers.arrayElements(variants, itemCount);

            const paymentMethod = faker.datatype.boolean({ probability: 0.8 })
              ? PaymentMethod.COD
              : PaymentMethod.BANK_TRANSFER_QR;

            const statusWeights =
              paymentMethod === PaymentMethod.BANK_TRANSFER_QR
                ? [
                    { status: OrderStatus.DELIVERED, weight: 52 },
                    { status: OrderStatus.SHIPPED, weight: 10 },
                    { status: OrderStatus.AWAITING_SHIPMENT, weight: 8 },
                    { status: OrderStatus.PROCESSING, weight: 8 },
                    { status: OrderStatus.PENDING_CONFIRMATION, weight: 7 },
                    { status: OrderStatus.PENDING_PAYMENT, weight: 10 },
                    { status: OrderStatus.CANCELLED, weight: 5 },
                  ]
                : [
                    { status: OrderStatus.DELIVERED, weight: 60 },
                    { status: OrderStatus.SHIPPED, weight: 10 },
                    { status: OrderStatus.AWAITING_SHIPMENT, weight: 8 },
                    { status: OrderStatus.PROCESSING, weight: 7 },
                    { status: OrderStatus.PENDING_CONFIRMATION, weight: 10 },
                    { status: OrderStatus.CANCELLED, weight: 5 },
                  ];

            let sum = 0;
            const totalWeight = statusWeights.reduce((acc, item) => acc + item.weight, 0);
            const r = Math.random() * totalWeight;
            let status: OrderStatus = OrderStatus.DELIVERED;
            for (const sw of statusWeights) {
              sum += sw.weight;
              if (r <= sum) {
                status = sw.status;
                break;
              }
            }

            const paymentStatus =
              paymentMethod === PaymentMethod.BANK_TRANSFER_QR
                ? status === OrderStatus.PENDING_PAYMENT
                  ? PaymentStatus.PENDING
                  : status === OrderStatus.CANCELLED
                    ? PaymentStatus.CANCELLED
                    : PaymentStatus.SUCCESS
                : status === OrderStatus.DELIVERED
                  ? PaymentStatus.SUCCESS
                  : status === OrderStatus.CANCELLED
                    ? PaymentStatus.CANCELLED
                    : PaymentStatus.PENDING;
            const ward = wards.length > 0 ? faker.helpers.arrayElement(wards) : null;

            const yy = String(orderCreatedAt.getUTCFullYear()).slice(2);
            const mm = String(orderCreatedAt.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(orderCreatedAt.getUTCDate()).padStart(2, '0');
            const orderCode = `S${yy}${mm}${dd}${orderSeq.toString(36).toUpperCase().padStart(5, '0').slice(-5)}`;
            const paymentCode = `DH${orderCode}`;

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

            const initialStatus =
              paymentMethod === PaymentMethod.BANK_TRANSFER_QR
                ? OrderStatus.PENDING_PAYMENT
                : OrderStatus.PENDING_CONFIRMATION;
            const histories: Prisma.OrderStatusHistoryCreateManyOrderInput[] = [
              { status: initialStatus, createdAt: orderCreatedAt },
            ];
            let workflowTime = orderCreatedAt;

            if (
              paymentMethod === PaymentMethod.BANK_TRANSFER_QR &&
              status !== OrderStatus.PENDING_PAYMENT
            ) {
              workflowTime = new Date(
                orderCreatedAt.getTime() + faker.number.int({ min: 1, max: 24 }) * 3600000,
              );
              histories.push({
                status: OrderStatus.PENDING_CONFIRMATION,
                createdAt: workflowTime,
              });
            }

            if (status === OrderStatus.CANCELLED) {
              workflowTime = new Date(
                workflowTime.getTime() + faker.number.int({ min: 1, max: 72 }) * 3600000,
              );
              histories.push({ status: OrderStatus.CANCELLED, createdAt: workflowTime });
            } else if (
              status === OrderStatus.PROCESSING ||
              status === OrderStatus.AWAITING_SHIPMENT ||
              status === OrderStatus.SHIPPED ||
              status === OrderStatus.DELIVERED
            ) {
              workflowTime = new Date(
                workflowTime.getTime() + faker.number.int({ min: 1, max: 24 }) * 3600000,
              );
              histories.push({ status: OrderStatus.PROCESSING, createdAt: workflowTime });

              if (
                status === OrderStatus.AWAITING_SHIPMENT ||
                status === OrderStatus.SHIPPED ||
                status === OrderStatus.DELIVERED
              ) {
                workflowTime = new Date(
                  workflowTime.getTime() + faker.number.int({ min: 6, max: 48 }) * 3600000,
                );
                histories.push({ status: OrderStatus.AWAITING_SHIPMENT, createdAt: workflowTime });
              }

              if (status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED) {
                workflowTime = new Date(
                  workflowTime.getTime() + faker.number.int({ min: 12, max: 72 }) * 3600000,
                );
                histories.push({ status: OrderStatus.SHIPPED, createdAt: workflowTime });
              }

              if (status === OrderStatus.DELIVERED) {
                workflowTime = new Date(
                  workflowTime.getTime() + faker.number.int({ min: 24, max: 96 }) * 3600000,
                );
                histories.push({ status: OrderStatus.DELIVERED, createdAt: workflowTime });
              }
            }

            const orderUpdatedAt = histories[histories.length - 1]?.createdAt ?? orderCreatedAt;

            const matchedAt = new Date(orderUpdatedAt);
            const paidAt = paymentStatus === PaymentStatus.SUCCESS ? matchedAt : null;

            const order = await tx.order.create({
              data: {
                orderCode,
                paymentCode,
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
              },
              include: { items: true },
            });

            const paymentData: Prisma.PaymentUncheckedCreateInput = {
              orderId: order.id,
              method: paymentMethod,
              status: paymentStatus,
              provider: paymentMethod === PaymentMethod.BANK_TRANSFER_QR ? 'SEPAY' : null,
              transactionId:
                paymentMethod === PaymentMethod.BANK_TRANSFER_QR &&
                paymentStatus === PaymentStatus.SUCCESS
                  ? `SEPAY-${orderCode}`
                  : null,
              providerReferenceCode:
                paymentMethod === PaymentMethod.BANK_TRANSFER_QR &&
                paymentStatus === PaymentStatus.SUCCESS
                  ? `REF-${orderCode}`
                  : null,
              bankCode: paymentMethod === PaymentMethod.BANK_TRANSFER_QR ? 'MBBank' : null,
              bankName:
                paymentMethod === PaymentMethod.BANK_TRANSFER_QR ? 'Ngân hàng TMCP Quân đội' : null,
              accountNumber: paymentMethod === PaymentMethod.BANK_TRANSFER_QR ? '0903252427' : null,
              accountName: paymentMethod === PaymentMethod.BANK_TRANSFER_QR ? 'BUI TAN VIET' : null,
              qrTemplate: paymentMethod === PaymentMethod.BANK_TRANSFER_QR ? 'compact' : null,
              transferContent:
                paymentMethod === PaymentMethod.BANK_TRANSFER_QR ? paymentCode : null,
              qrImageUrl:
                paymentMethod === PaymentMethod.BANK_TRANSFER_QR
                  ? `https://qr.sepay.vn/img?bank=MBBank&acc=0903252427&template=compact&amount=${total}&des=${paymentCode}`
                  : null,
              amount: total,
              amountPaid: paymentStatus === PaymentStatus.SUCCESS ? total : 0,
              paidAt,
              expiredAt:
                paymentMethod === PaymentMethod.BANK_TRANSFER_QR &&
                paymentStatus !== PaymentStatus.SUCCESS &&
                paymentStatus !== PaymentStatus.CANCELLED
                  ? new Date(orderCreatedAt.getTime() + 15 * 60 * 1000)
                  : null,
              lastPayloadReceivedAt: paymentStatus === PaymentStatus.SUCCESS ? paidAt : null,
              createdAt: orderCreatedAt,
              updatedAt: paidAt ?? orderUpdatedAt,
            };

            const payment = await tx.payment.create({
              data: paymentData,
            });

            if (
              paymentMethod === PaymentMethod.BANK_TRANSFER_QR &&
              paymentStatus === PaymentStatus.SUCCESS
            ) {
              await tx.sepayTransaction.create({
                data: {
                  sepayTransactionId: 900000 + order.id,
                  gateway: 'MBBank',
                  transactionDate: paidAt ?? matchedAt,
                  accountNumber: '0903252427',
                  subAccount: null,
                  transferType: 'IN',
                  transferAmount: total,
                  accumulated: faker.number.int({ min: total, max: total * 20 }),
                  code: null,
                  content: paymentCode,
                  referenceCode: `MBVCB.${faker.number.int({ min: 100000000, max: 999999999 })}`,
                  description: `Thanh toan don hang ${orderCode}`,
                  orderId: order.id,
                  paymentId: payment.id,
                  matchedPaymentCode: paymentCode,
                  matchStatus: 'MATCHED',
                  rawPayload: {
                    id: 900000 + order.id,
                    gateway: 'MBBank',
                    transactionDate: (paidAt ?? matchedAt).toISOString(),
                    accountNumber: '0903252427',
                    code: null,
                    content: paymentCode,
                    transferType: 'in',
                    transferAmount: total,
                    accumulated: total,
                    subAccount: null,
                    referenceCode: `REF-${orderCode}`,
                    description: `Thanh toan don hang ${orderCode}`,
                  },
                  receivedAt: paidAt ?? matchedAt,
                  processedAt: paidAt ?? matchedAt,
                },
              });
            }

            if (
              status === OrderStatus.AWAITING_SHIPMENT ||
              status === OrderStatus.SHIPPED ||
              status === OrderStatus.DELIVERED
            ) {
              const stockEventAt =
                histories.find((h) => h.status === OrderStatus.AWAITING_SHIPMENT)?.createdAt ??
                orderUpdatedAt;
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
        },
        {
          maxWait: 10_000,
          timeout: 30_000,
        },
      );
      console.log(`Created ${Math.min(i + BATCH_SIZE, ORDER_COUNT)} orders...`);
    }

    console.log(`Seed orders done: ${ORDER_COUNT} orders created.`);
  } finally {
    await prisma.$disconnect();
  }
}
