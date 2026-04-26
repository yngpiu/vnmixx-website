import { Injectable } from '@nestjs/common';
import { ChatSenderType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

/**
 * Interface cho dữ liệu chi tiết cuộc hội thoại.
 */
export interface ChatDetailView {
  id: number;
  customerId: number;
  createdAt: Date;
  customer: { fullName: string };
  assignments: {
    employee: { id: number; fullName: string };
    assignedAt: Date;
  }[];
}

/**
 * Interface cho dữ liệu tóm tắt cuộc hội thoại trong danh sách.
 */
export interface ChatSummaryView {
  id: number;
  customerId: number;
  createdAt: Date;
  customer: { fullName: string };
  assignments: { employee: { fullName: string } }[];
  messages: { content: string; createdAt: Date }[];
}

/**
 * Interface cho dữ liệu tin nhắn.
 */
export interface MessageView {
  id: number;
  chatId: number;
  senderType: ChatSenderType;
  senderCustomerId: number | null;
  senderEmployeeId: number | null;
  content: string;
  createdAt: Date;
}

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

const MESSAGE_SELECT = {
  id: true,
  chatId: true,
  senderType: true,
  senderCustomerId: true,
  senderEmployeeId: true,
  content: true,
  createdAt: true,
} as const;

@Injectable()
// Repository Prisma cho các thao tác dữ liệu chat hỗ trợ.
export class SupportChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Tìm cuộc hội thoại theo customerId.
  async findByCustomerId(customerId: number): Promise<ChatDetailView | null> {
    return this.prisma.supportChat.findUnique({
      where: { customerId },
      select: CHAT_DETAIL_SELECT,
    }) as Promise<ChatDetailView | null>;
  }

  // Tìm cuộc hội thoại theo ID.
  async findById(chatId: number): Promise<ChatDetailView | null> {
    return this.prisma.supportChat.findUnique({
      where: { id: chatId },
      select: CHAT_DETAIL_SELECT,
    }) as Promise<ChatDetailView | null>;
  }

  // Kiểm tra cuộc hội thoại có tồn tại hay không.
  async existsById(chatId: number): Promise<boolean> {
    const row = await this.prisma.supportChat.findUnique({
      where: { id: chatId },
      select: { id: true },
    });
    return row !== null;
  }

  // Tạo mới một cuộc hội thoại cho khách hàng.
  async create(customerId: number): Promise<ChatDetailView> {
    return this.prisma.supportChat.create({
      data: { customerId },
      select: CHAT_DETAIL_SELECT,
    }) as Promise<ChatDetailView>;
  }

  // Lấy danh sách các cuộc hội thoại với phân trang và bộ lọc nhân viên.
  async findMany(skip: number, take: number, employeeId?: number): Promise<ChatSummaryView[]> {
    const where = employeeId ? { assignments: { some: { employeeId } } } : undefined;
    return this.prisma.supportChat.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      select: CHAT_LIST_SELECT,
    }) as Promise<ChatSummaryView[]>;
  }

  // Đếm tổng số cuộc hội thoại theo bộ lọc.
  async count(employeeId?: number): Promise<number> {
    const where = employeeId ? { assignments: { some: { employeeId } } } : undefined;
    return this.prisma.supportChat.count({ where });
  }

  // Lấy danh sách các cuộc hội thoại mà một nhân viên cụ thể tham gia.
  async findByEmployeeId(employeeId: number): Promise<ChatSummaryView[]> {
    const assignments = await this.prisma.chatAssignment.findMany({
      where: { employeeId },
      select: { chat: { select: CHAT_LIST_SELECT } },
      orderBy: { assignedAt: 'desc' },
    });
    return assignments.map((a) => a.chat) as ChatSummaryView[];
  }

  // Kiểm tra sự phân công giữa nhân viên và cuộc hội thoại.
  async findAssignment(chatId: number, employeeId: number) {
    return this.prisma.chatAssignment.findUnique({
      where: { chatId_employeeId: { chatId, employeeId } },
    });
  }

  // Tạo mới một bản ghi phân công nhân viên vào cuộc hội thoại.
  async createAssignment(chatId: number, employeeId: number) {
    return this.prisma.chatAssignment.create({
      data: { chatId, employeeId },
    });
  }

  // Lưu tin nhắn mới vào cơ sở dữ liệu.
  async createMessage(data: CreateMessageData): Promise<MessageView> {
    return this.prisma.chatMessage.create({
      data: {
        chatId: data.chatId,
        senderType: data.senderType,
        senderCustomerId: data.senderType === ChatSenderType.CUSTOMER ? data.senderId : null,
        senderEmployeeId: data.senderType === ChatSenderType.EMPLOYEE ? data.senderId : null,
        content: data.content,
      },
      select: MESSAGE_SELECT,
    }) as Promise<MessageView>;
  }

  // Lấy danh sách tin nhắn cũ hơn cursor cho một cuộc hội thoại.
  async findMessages(
    chatId: number,
    cursor: number | undefined,
    take: number,
  ): Promise<MessageView[]> {
    return this.prisma.chatMessage.findMany({
      where: {
        chatId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: 'desc' },
      take,
      select: MESSAGE_SELECT,
    }) as Promise<MessageView[]>;
  }

  // Lấy danh sách tên khách hàng theo IDs.
  async findCustomerNames(ids: number[]) {
    return this.prisma.customer.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
  }

  // Lấy danh sách tên nhân viên theo IDs.
  async findEmployeeNames(ids: number[]) {
    return this.prisma.employee.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
  }
}
