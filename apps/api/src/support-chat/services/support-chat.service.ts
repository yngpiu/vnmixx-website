import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatSenderType } from '../../../generated/prisma/client';
import {
  ChatDetailResponseDto,
  ChatListResponseDto,
  ChatMessageResponseDto,
  ChatSummaryResponseDto,
  MessagesListResponseDto,
} from '../dto';
import { ListChatsQueryDto } from '../dto/list-chats-query.dto';
import { MessagesQueryDto } from '../dto/messages-query.dto';
import {
  ChatDetailView,
  ChatSummaryView,
  MessageView,
  SupportChatRepository,
} from '../repositories/support-chat.repository';

interface SendMessageInput {
  readonly chatId: number;
  readonly senderType: ChatSenderType;
  readonly senderId: number;
  readonly content: string;
}

@Injectable()
// Xử lý luồng nghiệp vụ liên quan đến chat hỗ trợ khách hàng.
export class SupportChatService {
  constructor(private readonly repository: SupportChatRepository) {}

  // Tìm cuộc hội thoại hiện có hoặc tạo mới nếu khách hàng chưa có chat.
  async findOrCreateChat(customerId: number): Promise<ChatDetailResponseDto> {
    const existing = await this.repository.findByCustomerId(customerId);
    if (existing) return this.mapChatDetail(existing);

    const created = await this.repository.create(customerId);
    return this.mapChatDetail(created);
  }

  // Lấy thông tin cuộc hội thoại của một khách hàng cụ thể.
  async findChatByCustomer(customerId: number): Promise<ChatDetailResponseDto | null> {
    const chat = await this.repository.findByCustomerId(customerId);
    if (!chat) return null;

    return this.mapChatDetail(chat);
  }

  // Lưu tin nhắn mới và trả về dữ liệu tin nhắn kèm tên người gửi.
  async sendMessage(input: SendMessageInput): Promise<ChatMessageResponseDto> {
    const isExists = await this.repository.existsById(input.chatId);
    if (!isExists) {
      throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${input.chatId}`);
    }

    const message = await this.repository.createMessage(input);
    const senderName = await this.resolveSenderName(input.senderType, input.senderId);

    return this.mapMessage(message, senderName);
  }

  // Phân công nhân viên vào hỗ trợ cuộc hội thoại.
  async assignEmployee(chatId: number, employeeId: number): Promise<ChatDetailResponseDto> {
    const isExists = await this.repository.existsById(chatId);
    if (!isExists) {
      throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${chatId}`);
    }

    const existing = await this.repository.findAssignment(chatId, employeeId);
    if (existing) {
      throw new ConflictException('Bạn đã được phân công vào cuộc hội thoại này.');
    }

    await this.repository.createAssignment(chatId, employeeId);
    return this.getChatDetail(chatId);
  }

  // Lấy chi tiết cuộc hội thoại bao gồm các nhân viên đã được phân công.
  async getChatDetail(chatId: number): Promise<ChatDetailResponseDto> {
    const chat = await this.repository.findById(chatId);
    if (!chat) {
      throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${chatId}`);
    }

    return this.mapChatDetail(chat);
  }

  // Lấy danh sách tin nhắn cũ hơn cursor để phục vụ infinite scroll.
  async getMessages(chatId: number, query: MessagesQueryDto): Promise<MessagesListResponseDto> {
    const limit = query.limit ?? 30;
    const isExists = await this.repository.existsById(chatId);
    if (!isExists) {
      throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${chatId}`);
    }

    const messages = await this.repository.findMessages(chatId, query.cursor, limit + 1);
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

  // Lấy danh sách các cuộc hội thoại cho trang quản trị với phân trang.
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
      items: chats.map((chat) => this.mapChatSummary(chat)),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  // Kiểm tra xem nhân viên đã được phân công vào chat chưa.
  async isEmployeeAssigned(chatId: number, employeeId: number): Promise<boolean> {
    const assignment = await this.repository.findAssignment(chatId, employeeId);
    return assignment !== null;
  }

  // Kiểm tra xem khách hàng có phải chủ sở hữu của cuộc hội thoại không.
  async isCustomerOwner(chatId: number, customerId: number): Promise<boolean> {
    const chat = await this.repository.findByCustomerId(customerId);
    return chat?.id === chatId;
  }

  // ─── Các hàm hỗ trợ ánh xạ dữ liệu (Mapping) ──────────────────────────

  private mapChatDetail(chat: ChatDetailView): ChatDetailResponseDto {
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

  private mapChatSummary(chat: ChatSummaryView): ChatSummaryResponseDto {
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

  private mapMessage(msg: MessageView, senderName: string | null): ChatMessageResponseDto {
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

  private async resolveSenderNames(messages: MessageView[]): Promise<Map<string, string>> {
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
      for (const c of customers) {
        nameMap.set(`CUSTOMER:${c.id}`, c.fullName);
      }
    }

    if (employeeIds.size > 0) {
      const employees = await this.repository.findEmployeeNames([...employeeIds]);
      for (const e of employees) {
        nameMap.set(`EMPLOYEE:${e.id}`, e.fullName);
      }
    }

    return nameMap;
  }

  private buildSenderKey(msg: MessageView): string {
    const id =
      msg.senderType === ChatSenderType.CUSTOMER ? msg.senderCustomerId : msg.senderEmployeeId;
    return `${msg.senderType}:${id}`;
  }
}
