import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { ChatSenderType, PrismaClient } from '../generated/prisma/client';

const DEMO_CHAT_COUNT = 8;

const DEMO_MESSAGES = [
  'Xin chào shop, tôi muốn kiểm tra tình trạng đơn hàng gần nhất.',
  'Em chào anh/chị, mình vui lòng cho em mã đơn để kiểm tra nhanh nhé.',
  'Mã đơn của tôi là VNM123456, tôi cần nhận trước thứ 6.',
  'Em đã ghi nhận, đơn đang ở trạng thái đang xử lý và sẽ giao trước thứ 6 ạ.',
];

export async function seedSupportChats(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL (tạo apps/api/.env từ .env.example hoặc export biến).');
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const [customers, employees] = await Promise.all([
      prisma.customer.findMany({
        where: { deletedAt: null, isActive: true },
        orderBy: { id: 'asc' },
        take: DEMO_CHAT_COUNT,
        select: { id: true },
      }),
      prisma.employee.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        orderBy: { id: 'asc' },
        take: 5,
        select: { id: true },
      }),
    ]);

    if (customers.length === 0 || employees.length === 0) {
      console.warn('Seed support chat skipped: thiếu customer hoặc employee dữ liệu nguồn.');
      return;
    }

    let seededChats = 0;
    let seededAssignments = 0;
    let seededMessages = 0;

    for (let index = 0; index < customers.length; index += 1) {
      const customer = customers[index];
      const assignedEmployee = employees[index % employees.length];

      const chat = await prisma.supportChat.upsert({
        where: { customerId: customer.id },
        create: { customerId: customer.id },
        update: {},
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
        },
        update: {},
      });
      seededAssignments += 1;

      const existingMessageCount = await prisma.chatMessage.count({
        where: { chatId: chat.id },
      });
      if (existingMessageCount > 0) continue;

      for (let msgIndex = 0; msgIndex < DEMO_MESSAGES.length; msgIndex += 1) {
        const senderType = msgIndex % 2 === 0 ? ChatSenderType.CUSTOMER : ChatSenderType.EMPLOYEE;
        await prisma.chatMessage.create({
          data: {
            chatId: chat.id,
            senderType,
            senderCustomerId: senderType === ChatSenderType.CUSTOMER ? customer.id : null,
            senderEmployeeId: senderType === ChatSenderType.EMPLOYEE ? assignedEmployee.id : null,
            content: DEMO_MESSAGES[msgIndex],
          },
        });
        seededMessages += 1;
      }
    }

    console.log(
      `Seed support chat done: chats=${seededChats}, assignments=${seededAssignments}, messages=${seededMessages}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
