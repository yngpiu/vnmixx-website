import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { OrderStatus, Prisma, PrismaClient } from '../generated/prisma/client';
import { clampDate, resolveSeedAsOfDate } from './seed-date-range';

const REVIEW_TITLES = [
  'Vượt mong đợi',
  'Đúng mô tả',
  'Đáng tiền',
  'Form đẹp',
  'Chất vải ổn',
  'Sẽ mua lại',
  'Sản phẩm tuyệt vời',
  'Đóng gói cẩn thận',
  'Giao hàng cực nhanh',
  'Màu sắc hơi lệch so với ảnh',
  'Hơi chật so với size',
  'Rất hài lòng',
  'Chất lượng kém',
  'Tạm ổn',
];

const REVIEW_COMMENTS = [
  'Mặc lên form chuẩn, giao hàng nhanh. Shop tư vấn nhiệt tình.',
  'Chất liệu ổn trong tầm giá, đóng gói kỹ. Rất ưng ý.',
  'Màu sắc đúng ảnh, nên thử nếu thích phong cách basic.',
  'Đường may khá ổn, giặt chưa bị bai. Vải mềm mịn.',
  'Đeo hằng ngày thấy thoải mái, khá hài lòng.',
  'Shop hỗ trợ nhanh, trải nghiệm tốt. Sẽ ủng hộ thêm.',
  'Chất vải mát mẻ, phù hợp mùa hè. Đường chỉ chắc chắn.',
  'Form dáng đẹp nhưng màu thực tế hơi tối hơn ảnh một chút.',
  'Hàng y hình, giá cả hợp lý. Giao hàng cực nhanh luôn.',
  'Sản phẩm chất lượng tốt, đúng mô tả. Đóng gói rất cẩn thận.',
  'Mặc hơi chật ở phần vai, các bạn nên tăng 1 size nhé.',
  'Vải hơi mỏng, nhưng với giá này thì chấp nhận được.',
  'Tuyệt vời, không có gì để chê. Mọi người nên mua nha.',
  'Giao hàng hơi chậm nhưng bù lại sản phẩm rất đẹp.',
  'Thực sự thất vọng, chất vải không giống mô tả.',
];

export async function seedProductReviews(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL');
  }
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    try {
      await prisma.productReview.deleteMany({});
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2021'
      ) {
        console.log('Skip seedProductReviews: bảng product_reviews chưa tồn tại.');
        return;
      }
      throw error;
    }

    const asOf = resolveSeedAsOfDate();
    const reviewProbability = Math.min(
      1,
      Math.max(0, parseFloat(process.env.SEED_REVIEW_ORDER_FRACTION ?? '0.52')),
    );

    console.log('Fetching delivered orders...');
    const deliveredOrders = await prisma.order.findMany({
      where: { status: OrderStatus.DELIVERED },
      include: { items: { include: { variant: true } } },
      orderBy: { createdAt: 'asc' },
      take: Number(process.env.SEED_REVIEW_MAX_ORDERS ?? 25_000),
    });

    if (deliveredOrders.length === 0) {
      console.log('Skip seedProductReviews: Không có đơn hàng DELIVERED nào.');
      return;
    }

    faker.seed(999);
    let created = 0;
    const reviewsToCreate: Prisma.ProductReviewCreateManyInput[] = [];

    const seenOrderItemIds = new Set<number>();

    for (const order of deliveredOrders) {
      if (!faker.datatype.boolean({ probability: Math.min(1, Math.max(0, reviewProbability)) })) {
        continue;
      }
      const itemToReview = faker.helpers.arrayElement(order.items);
      if (seenOrderItemIds.has(itemToReview.id)) {
        continue;
      }
      seenOrderItemIds.add(itemToReview.id);
      const reviewDateRaw = new Date(
        order.createdAt.getTime() + faker.number.int({ min: 24, max: 336 }) * 3600000,
      );
      const reviewDate = clampDate(reviewDateRaw, order.createdAt, asOf);

      const rating = faker.helpers.weightedArrayElement([
        { weight: 60, value: 5 },
        { weight: 25, value: 4 },
        { weight: 10, value: 3 },
        { weight: 3, value: 2 },
        { weight: 2, value: 1 },
      ]);

      let title = '';
      let content = '';

      if (rating >= 4) {
        title = faker.helpers.arrayElement(REVIEW_TITLES.slice(0, 9).concat(['Rất hài lòng']));
        content = faker.helpers.arrayElement(
          REVIEW_COMMENTS.slice(0, 10).concat([
            'Tuyệt vời, không có gì để chê. Mọi người nên mua nha.',
          ]),
        );
      } else if (rating === 3) {
        title = faker.helpers.arrayElement(['Tạm ổn', 'Form đẹp', 'Bình thường']);
        content = faker.helpers.arrayElement([
          'Giao hàng hơi chậm nhưng bù lại sản phẩm rất đẹp.',
          'Màu sắc hơi lệch so với ảnh.',
          'Vải hơi mỏng, nhưng với giá này thì chấp nhận được.',
        ]);
      } else {
        title = faker.helpers.arrayElement(['Chất lượng kém', 'Thất vọng']);
        content = faker.helpers.arrayElement([
          'Thực sự thất vọng, chất vải không giống mô tả.',
          'Mặc hơi chật ở phần vai.',
          'Giao hàng quá chậm.',
        ]);
      }

      reviewsToCreate.push({
        productId: itemToReview.variant.productId,
        customerId: order.customerId,
        orderItemId: itemToReview.id,
        rating,
        title,
        content,
        status: faker.datatype.boolean({ probability: 0.95 }) ? 'VISIBLE' : 'HIDDEN',
        createdAt: reviewDate,
        updatedAt: reviewDate,
      });
    }

    console.log(`Seeding ${reviewsToCreate.length} product reviews...`);

    const BATCH_SIZE = 1000;
    for (let i = 0; i < reviewsToCreate.length; i += BATCH_SIZE) {
      const batch = reviewsToCreate.slice(i, i + BATCH_SIZE);
      await prisma.productReview.createMany({
        data: batch,
        skipDuplicates: true,
      });
      created += batch.length;
    }

    console.log(`Seed product reviews done: ${created} rows.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedProductReviews().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
