import { Injectable } from '@nestjs/common';
import { ChatSenderType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

interface CreateMessageData {
  readonly chatId: number;
  readonly senderType: ChatSenderType;
  readonly senderId: number;
  readonly content: string;
}

const CHAT_DETAIL_SELECT = {
  id: true,
  customerId: true,
  createdAt: true,
  customer: { select: { fullName: true } },
  assignments: {
    select: {
      assignedAt: true,
      employee: { select: { id: true, fullName: true } },
    },
    orderBy: { assignedAt: 'asc' as const },
  },
} as const;

const CHAT_LIST_SELECT = {
  id: true,
  customerId: true,
  createdAt: true,
  customer: { select: { fullName: true } },
  assignments: { select: { employee: { select: { fullName: true } } } },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { content: true, createdAt: true },
  },
} as const;

/**
 * SupportChatRepository: Truy cập dữ liệu chat hỗ trợ qua Prisma.
 * Đóng gói toàn bộ truy vấn CSDL, không chứa logic nghiệp vụ.
 */
@Injectable()
export class SupportChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tìm chat theo customerId (unique). */
  async findByCustomerId(customerId: number) {
    return this.prisma.supportChat.findUnique({
      where: { customerId },
      select: CHAT_DETAIL_SELECT,
    });
  }

  /** Tìm chat theo ID. */
  async findById(chatId: number) {
    return this.prisma.supportChat.findUnique({
      where: { id: chatId },
      select: CHAT_DETAIL_SELECT,
    });
  }

  /** Tìm chat theo ID chỉ trả về ID (kiểm tra tồn tại). */
  async existsById(chatId: number): Promise<boolean> {
    const row = await this.prisma.supportChat.findUnique({
      where: { id: chatId },
      select: { id: true },
    });
    return row !== null;
  }

  /** Tạo chat mới cho khách hàng. */
  async create(customerId: number) {
    return this.prisma.supportChat.create({
      data: { customerId },
      select: CHAT_DETAIL_SELECT,
    });
  }

  /** Lấy danh sách chat với phân trang. */
  async findMany(skip: number, take: number, employeeId?: number) {
    const where = employeeId ? { assignments: { some: { employeeId } } } : undefined;
    return this.prisma.supportChat.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      select: CHAT_LIST_SELECT,
    });
  }

  /** Đếm tổng số chat. */
  async count(employeeId?: number): Promise<number> {
    const where = employeeId ? { assignments: { some: { employeeId } } } : undefined;
    return this.prisma.supportChat.count({ where });
  }

  /** Tìm tất cả chat của một nhân viên đang tham gia. */
  async findByEmployeeId(employeeId: number) {
    const assignments = await this.prisma.chatAssignment.findMany({
      where: { employeeId },
      select: { chat: { select: CHAT_LIST_SELECT } },
      orderBy: { assignedAt: 'desc' },
    });
    return assignments.map((a) => a.chat);
  }

  /** Kiểm tra assignment tồn tại. */
  async findAssignment(chatId: number, employeeId: number) {
    return this.prisma.chatAssignment.findUnique({
      where: { chatId_employeeId: { chatId, employeeId } },
    });
  }

  /** Tạo assignment mới. */
  async createAssignment(chatId: number, employeeId: number) {
    return this.prisma.chatAssignment.create({
      data: { chatId, employeeId },
    });
  }

  /** Tạo tin nhắn mới. */
  async createMessage(data: CreateMessageData) {
    return this.prisma.chatMessage.create({
      data: {
        chatId: data.chatId,
        senderType: data.senderType,
        senderCustomerId: data.senderType === ChatSenderType.CUSTOMER ? data.senderId : null,
        senderEmployeeId: data.senderType === ChatSenderType.EMPLOYEE ? data.senderId : null,
        content: data.content,
      },
    });
  }

  /** Lấy tin nhắn với cursor-based pagination (cũ hơn cursor). */
  async findMessages(chatId: number, cursor: number | undefined, take: number) {
    return this.prisma.chatMessage.findMany({
      where: {
        chatId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: 'desc' },
      take,
    });
  }

  /** Tìm tên khách hàng theo danh sách ID. */
  async findCustomerNames(ids: number[]) {
    return this.prisma.customer.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
  }

  /** Tìm tên nhân viên theo danh sách ID. */
  async findEmployeeNames(ids: number[]) {
    return this.prisma.employee.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
  }
}
