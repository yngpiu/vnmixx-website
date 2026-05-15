import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import {
  ChatSenderType,
  SupportChatAiMode,
  SupportChatStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

/**
 * Interface cho dữ liệu chi tiết cuộc hội thoại.
 */
export interface ChatDetailView {
  id: number;
  customerId: number | null;
  aiMode: SupportChatAiMode;
  status: SupportChatStatus;
  createdAt: Date;
  customer: { fullName: string } | null;
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
  customerId: number | null;
  createdAt: Date;
  customer: {
    fullName: string;
    email: string;
    phoneNumber: string;
    avatarUrl: string | null;
  } | null;
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
  readonly senderId?: number;
  readonly content: string;
}

const CHAT_DETAIL_SELECT = {
  id: true,
  customerId: true,
  aiMode: true,
  status: true,
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
  customer: { select: { fullName: true, email: true, phoneNumber: true, avatarUrl: true } },
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

  private buildChatListWhere(
    employeeId?: number,
    search?: string,
    customerType?: 'all' | 'customer' | 'guest',
  ): Prisma.SupportChatWhereInput {
    const normalizedSearch = search?.trim();
    const where: Prisma.SupportChatWhereInput = {};

    if (employeeId) {
      where.assignments = { some: { employeeId } };
    }

    if (customerType === 'guest') {
      where.customerId = null;
    } else if (customerType === 'customer') {
      where.customerId = { not: null };
    }

    if (normalizedSearch) {
      where.customer = {
        OR: [
          { fullName: { contains: normalizedSearch } },
          { email: { contains: normalizedSearch } },
          { phoneNumber: { contains: normalizedSearch } },
        ],
      };
    }

    return where;
  }

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
      data: { customerId, guestSessionSecretHash: null },
      select: CHAT_DETAIL_SELECT,
    }) as Promise<ChatDetailView>;
  }

  /** Guest session identity: exactly one XOR with customerId enforced by application. */
  async createForGuestSession(guestSessionSecretHash: string): Promise<ChatDetailView> {
    return this.prisma.supportChat.create({
      data: { customerId: null, guestSessionSecretHash },
      select: CHAT_DETAIL_SELECT,
    }) as Promise<ChatDetailView>;
  }

  async findByGuestSessionSecretHash(secretHash: string): Promise<ChatDetailView | null> {
    return this.prisma.supportChat.findUnique({
      where: { guestSessionSecretHash: secretHash },
      select: CHAT_DETAIL_SELECT,
    }) as Promise<ChatDetailView | null>;
  }

  // Lấy danh sách các cuộc hội thoại với phân trang và bộ lọc nhân viên.
  async findMany(
    skip: number,
    take: number,
    employeeId?: number,
    search?: string,
    customerType?: 'all' | 'customer' | 'guest',
  ): Promise<ChatSummaryView[]> {
    const where = this.buildChatListWhere(employeeId, search, customerType);
    return this.prisma.supportChat.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      select: CHAT_LIST_SELECT,
    }) as Promise<ChatSummaryView[]>;
  }

  // Đếm tổng số cuộc hội thoại theo bộ lọc.
  async count(
    employeeId?: number,
    search?: string,
    customerType?: 'all' | 'customer' | 'guest',
  ): Promise<number> {
    const where = this.buildChatListWhere(employeeId, search, customerType);
    return this.prisma.supportChat.count({ where });
  }

  // Xóa vĩnh viễn một cuộc hội thoại; tin nhắn và phân công sẽ bị xóa cascade.
  async deleteById(chatId: number): Promise<void> {
    await this.prisma.supportChat.delete({
      where: { id: chatId },
    });
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
    if (data.senderType === ChatSenderType.GUEST) {
      return this.prisma.chatMessage.create({
        data: {
          chatId: data.chatId,
          senderType: ChatSenderType.GUEST,
          senderCustomerId: null,
          senderEmployeeId: null,
          content: data.content,
        },
        select: MESSAGE_SELECT,
      }) as Promise<MessageView>;
    }
    if (data.senderType === ChatSenderType.AI) {
      return this.prisma.chatMessage.create({
        data: {
          chatId: data.chatId,
          senderType: ChatSenderType.AI,
          senderCustomerId: null,
          senderEmployeeId: null,
          content: data.content,
        },
        select: MESSAGE_SELECT,
      }) as Promise<MessageView>;
    }
    const senderNumericId = typeof data.senderId !== 'undefined' ? data.senderId : null;
    if (senderNumericId === null) {
      throw new BadRequestException('senderId bắt buộc với vai trò CUSTOMER và EMPLOYEE.');
    }
    if (data.senderType === ChatSenderType.CUSTOMER) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: senderNumericId },
        select: { id: true },
      });
      if (!customer) {
        throw new NotFoundException(`Không tìm thấy khách hàng #${senderNumericId}`);
      }
    } else if (data.senderType === ChatSenderType.EMPLOYEE) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: senderNumericId },
        select: { id: true },
      });
      if (!employee) {
        throw new NotFoundException(`Không tìm thấy nhân viên #${senderNumericId}`);
      }
    } else {
      throw new BadRequestException('senderType không hợp lệ.');
    }

    return this.prisma.chatMessage.create({
      data: {
        chatId: data.chatId,
        senderType: data.senderType,
        senderCustomerId: data.senderType === ChatSenderType.CUSTOMER ? senderNumericId : null,
        senderEmployeeId: data.senderType === ChatSenderType.EMPLOYEE ? senderNumericId : null,
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
      select: { id: true, fullName: true, avatarUrl: true },
    });
  }

  // Lấy danh sách tên nhân viên theo IDs.
  async findEmployeeNames(ids: number[]) {
    return this.prisma.employee.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true, avatarUrl: true },
    });
  }

  // Lấy thông tin AI context của một cuộc hội thoại.
  async findChatAiContext(chatId: number): Promise<{
    id: number;
    aiMode: SupportChatAiMode;
    status: SupportChatStatus;
  } | null> {
    return this.prisma.supportChat.findUnique({
      where: { id: chatId },
      select: { id: true, aiMode: true, status: true },
    });
  }

  // Lấy N tin nhắn gần nhất của cuộc hội thoại để làm context cho AI.
  async findRecentMessagesForAi(
    chatId: number,
    limit: number,
  ): Promise<{ senderType: ChatSenderType; content: string }[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { id: 'desc' },
      take: limit,
      select: { senderType: true, content: true },
    });
    return rows.reverse();
  }

  // Cập nhật trạng thái AI của cuộc hội thoại.
  async updateAiState(
    chatId: number,
    data: { aiMode?: SupportChatAiMode; status?: SupportChatStatus },
  ): Promise<void> {
    await this.prisma.supportChat.update({ where: { id: chatId }, data });
  }
}
