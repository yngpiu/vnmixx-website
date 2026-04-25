import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatSenderType } from '../../../generated/prisma/client';
import type {
  ChatDetailResponseDto,
  ChatListResponseDto,
  ChatMessageResponseDto,
  ChatSummaryResponseDto,
  MessagesListResponseDto,
} from '../dto/chat-response.dto';
import type { ListChatsQueryDto } from '../dto/list-chats-query.dto';
import type { MessagesQueryDto } from '../dto/messages-query.dto';
import { SupportChatRepository } from '../repositories/support-chat.repository';

interface SendMessageInput {
  readonly chatId: number;
  readonly senderType: ChatSenderType;
  readonly senderId: number;
  readonly content: string;
}

type ChatDetailRow = {
  id: number;
  customerId: number;
  createdAt: Date;
  customer: { fullName: string };
  assignments: { employee: { id: number; fullName: string }; assignedAt: Date }[];
};

type ChatListRow = {
  id: number;
  customerId: number;
  createdAt: Date;
  customer: { fullName: string };
  assignments: { employee: { fullName: string } }[];
  messages: { content: string; createdAt: Date }[];
};

type MessageRow = {
  id: number;
  chatId: number;
  senderType: ChatSenderType;
  senderCustomerId: number | null;
  senderEmployeeId: number | null;
  content: string;
  createdAt: Date;
};

/**
 * SupportChatService: Xử lý nghiệp vụ chat hỗ trợ khách hàng.
 * Quản lý tạo/lấy cuộc hội thoại, gửi tin nhắn, phân công nhân viên và truy vấn dữ liệu.
 */
@Injectable()
export class SupportChatService {
  constructor(private readonly repository: SupportChatRepository) {}

  /**
   * Tìm hoặc tạo cuộc hội thoại cho khách hàng.
   * Mỗi khách chỉ có tối đa 1 cuộc chat (unique constraint trên customerId).
   */
  async findOrCreateChat(customerId: number): Promise<ChatDetailResponseDto> {
    const existing = await this.repository.findByCustomerId(customerId);
    if (existing) return this.mapChatDetail(existing as ChatDetailRow);
    const created = await this.repository.create(customerId);
    return this.mapChatDetail(created as ChatDetailRow);
  }

  /**
   * Lấy cuộc hội thoại hiện tại của khách hàng.
   */
  async findChatByCustomer(customerId: number): Promise<ChatDetailResponseDto | null> {
    const chat = await this.repository.findByCustomerId(customerId);
    if (!chat) return null;
    return this.mapChatDetail(chat as ChatDetailRow);
  }

  /**
   * Lưu tin nhắn mới vào cuộc hội thoại.
   */
  async sendMessage(input: SendMessageInput): Promise<ChatMessageResponseDto> {
    const isExists = await this.repository.existsById(input.chatId);
    if (!isExists) throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${input.chatId}`);
    const message = await this.repository.createMessage(input);
    const senderName = await this.resolveSenderName(input.senderType, input.senderId);
    return this.mapMessage(message as MessageRow, senderName);
  }

  /**
   * Phân công nhân viên vào cuộc hội thoại.
   */
  async assignEmployee(chatId: number, employeeId: number): Promise<ChatDetailResponseDto> {
    const isExists = await this.repository.existsById(chatId);
    if (!isExists) throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${chatId}`);
    const existing = await this.repository.findAssignment(chatId, employeeId);
    if (existing) throw new ConflictException('Bạn đã được phân công vào cuộc hội thoại này.');
    await this.repository.createAssignment(chatId, employeeId);
    return this.getChatDetail(chatId);
  }

  /**
   * Lấy chi tiết cuộc hội thoại theo ID.
   */
  async getChatDetail(chatId: number): Promise<ChatDetailResponseDto> {
    const chat = await this.repository.findById(chatId);
    if (!chat) throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${chatId}`);
    return this.mapChatDetail(chat as ChatDetailRow);
  }

  /**
   * Lấy lịch sử tin nhắn với cursor-based pagination.
   */
  async getMessages(chatId: number, query: MessagesQueryDto): Promise<MessagesListResponseDto> {
    const limit = query.limit ?? 30;
    const isExists = await this.repository.existsById(chatId);
    if (!isExists) throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${chatId}`);
    const messages = (await this.repository.findMessages(
      chatId,
      query.cursor,
      limit + 1,
    )) as MessageRow[];
    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const senderNames = await this.resolveSenderNames(items);
    return {
      items: items.map((msg) =>
        this.mapMessage(msg, senderNames.get(this.buildSenderKey(msg)) ?? null),
      ),
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * Lấy danh sách tất cả cuộc hội thoại (Admin) với phân trang.
   */
  async getAdminChats(
    query: ListChatsQueryDto,
    currentEmployeeId: number,
  ): Promise<ChatListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filterEmployeeId = query.assignedToMe ? currentEmployeeId : undefined;

    const [total, chats] = await Promise.all([
      this.repository.count(filterEmployeeId),
      this.repository.findMany((page - 1) * pageSize, pageSize, filterEmployeeId),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      items: (chats as ChatListRow[]).map((chat) => this.mapChatSummary(chat)),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Kiểm tra nhân viên có được phân công vào cuộc hội thoại hay không.
   */
  async isEmployeeAssigned(chatId: number, employeeId: number): Promise<boolean> {
    const assignment = await this.repository.findAssignment(chatId, employeeId);
    return assignment !== null;
  }

  /**
   * Kiểm tra khách hàng có sở hữu cuộc hội thoại hay không.
   */
  async isCustomerOwner(chatId: number, customerId: number): Promise<boolean> {
    const chat = await this.repository.findByCustomerId(customerId);
    return chat?.id === chatId;
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private mapChatDetail(chat: ChatDetailRow): ChatDetailResponseDto {
    return {
      id: chat.id,
      customerId: chat.customerId,
      customerName: chat.customer.fullName,
      assignments: chat.assignments.map((a) => ({
        employeeId: a.employee.id,
        employeeName: a.employee.fullName,
        assignedAt: a.assignedAt,
      })),
      createdAt: chat.createdAt,
    };
  }

  private mapChatSummary(chat: ChatListRow): ChatSummaryResponseDto {
    const lastMessage = chat.messages[0] ?? null;
    return {
      id: chat.id,
      customerId: chat.customerId,
      customerName: chat.customer.fullName,
      lastMessageContent: lastMessage?.content ?? null,
      lastMessageAt: lastMessage?.createdAt ?? null,
      assignedEmployeeNames: chat.assignments.map((a) => a.employee.fullName),
      createdAt: chat.createdAt,
    };
  }

  private mapMessage(msg: MessageRow, senderName: string | null): ChatMessageResponseDto {
    return {
      id: msg.id,
      chatId: msg.chatId,
      senderType: msg.senderType,
      senderCustomerId: msg.senderCustomerId,
      senderEmployeeId: msg.senderEmployeeId,
      senderName,
      content: msg.content,
      createdAt: msg.createdAt,
    };
  }

  private async resolveSenderName(
    senderType: ChatSenderType,
    senderId: number,
  ): Promise<string | null> {
    if (senderType === ChatSenderType.CUSTOMER) {
      const rows = await this.repository.findCustomerNames([senderId]);
      return rows[0]?.fullName ?? null;
    }
    const rows = await this.repository.findEmployeeNames([senderId]);
    return rows[0]?.fullName ?? null;
  }

  private async resolveSenderNames(messages: MessageRow[]): Promise<Map<string, string>> {
    const customerIds = new Set<number>();
    const employeeIds = new Set<number>();
    for (const msg of messages) {
      if (msg.senderType === ChatSenderType.CUSTOMER && msg.senderCustomerId) {
        customerIds.add(msg.senderCustomerId);
      }
      if (msg.senderType === ChatSenderType.EMPLOYEE && msg.senderEmployeeId) {
        employeeIds.add(msg.senderEmployeeId);
      }
    }
    const nameMap = new Map<string, string>();
    if (customerIds.size > 0) {
      const customers = await this.repository.findCustomerNames([...customerIds]);
      for (const c of customers) nameMap.set(`CUSTOMER:${c.id}`, c.fullName);
    }
    if (employeeIds.size > 0) {
      const employees = await this.repository.findEmployeeNames([...employeeIds]);
      for (const e of employees) nameMap.set(`EMPLOYEE:${e.id}`, e.fullName);
    }
    return nameMap;
  }

  private buildSenderKey(msg: MessageRow): string {
    const id =
      msg.senderType === ChatSenderType.CUSTOMER ? msg.senderCustomerId : msg.senderEmployeeId;
    return `${msg.senderType}:${id}`;
  }
}
