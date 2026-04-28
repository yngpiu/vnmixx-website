import { fakerVI as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { ChatSenderType, CustomerStatus, PrismaClient } from '../generated/prisma/client';
import { clampDate, resolveSeedAsOfDate, yearsBefore } from './seed-date-range';

const DEMO_MESSAGES = [
  'Xin chào shop, tôi muốn kiểm tra tình trạng đơn hàng gần nhất.',
  'Em chào anh/chị, mình vui lòng cho em mã đơn để kiểm tra nhanh nhé.',
  'Mã đơn của tôi là VNM123456, tôi cần nhận trước thứ 6.',
  'Em đã ghi nhận, đơn đang ở trạng thái đang xử lý và sẽ giao trước thứ 6 ạ.',
];

const DEMO_CHAT_COUNT = Number(process.env.SEED_SUPPORT_CHAT_COUNT ?? 48);

export async function seedSupportChats(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const [customers, employees] = await Promise.all([
      prisma.customer.findMany({
        where: { deletedAt: null, status: CustomerStatus.ACTIVE },
        orderBy: { id: 'asc' },
        take: DEMO_CHAT_COUNT,
        select: { id: true },
      }),
      prisma.employee.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        orderBy: { id: 'asc' },
        take: 8,
        select: { id: true },
      }),
    ]);

    if (customers.length === 0 || employees.length === 0) {
      console.warn('Seed support chat skipped: thiếu customer hoặc employee dữ liệu nguồn.');
      return;
    }

    const asOf = resolveSeedAsOfDate();
    const rangeStart = yearsBefore(asOf, 3);
    faker.seed(606);

    const customerIds = customers.map((c) => c.id);
    await prisma.chatMessage.deleteMany({
      where: { chat: { customerId: { in: customerIds } } },
    });
    await prisma.chatAssignment.deleteMany({
      where: { chat: { customerId: { in: customerIds } } },
    });

    let seededChats = 0;
    let seededAssignments = 0;
    let seededMessages = 0;

    for (let index = 0; index < customers.length; index += 1) {
      const customer = customers[index];
      const assignedEmployee = employees[index % employees.length];

      const threadStart = clampDate(
        faker.date.between({ from: rangeStart, to: asOf }),
        rangeStart,
        asOf,
      );
      const assignedAt = threadStart;

      const chat = await prisma.supportChat.upsert({
        where: { customerId: customer.id },
        create: {
          customerId: customer.id,
          createdAt: threadStart,
          updatedAt: threadStart,
        },
        update: { updatedAt: threadStart },
        select: { id: true },
      });
      seededChats += 1;

      await prisma.chatAssignment.upsert({
        where: {
          chatId_employeeId: {
            chatId: chat.id,
            employeeId: assignedEmployee.id,
          },
        },
        create: {
          chatId: chat.id,
          employeeId: assignedEmployee.id,
          assignedAt,
        },
        update: { assignedAt },
      });
      seededAssignments += 1;

      let messageAt = new Date(threadStart.getTime());
      for (let msgIndex = 0; msgIndex < DEMO_MESSAGES.length; msgIndex += 1) {
        const senderType = msgIndex % 2 === 0 ? ChatSenderType.CUSTOMER : ChatSenderType.EMPLOYEE;
        messageAt = new Date(
          messageAt.getTime() + faker.number.int({ min: 2, max: 180 }) * 60 * 1000,
        );
        const createdAt = clampDate(messageAt, rangeStart, asOf);
        await prisma.chatMessage.create({
          data: {
            chatId: chat.id,
            senderType,
            senderCustomerId: senderType === ChatSenderType.CUSTOMER ? customer.id : null,
            senderEmployeeId: senderType === ChatSenderType.EMPLOYEE ? assignedEmployee.id : null,
            content: DEMO_MESSAGES[msgIndex],
            createdAt,
          },
        });
        seededMessages += 1;
      }

      await prisma.supportChat.update({
        where: { id: chat.id },
        data: { updatedAt: messageAt },
      });
    }

    console.log(
      `Seed support chat done: chats=${seededChats}, assignments=${seededAssignments}, messages=${seededMessages} (cửa sổ ~3 năm tới SEED_AS_OF).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
