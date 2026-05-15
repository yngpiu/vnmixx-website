import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditLogStatus,
  ChatSenderType,
  SupportChatAiMode,
  SupportChatStatus,
} from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
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
  readonly senderId?: number;
  readonly content: string;
}

interface SenderProfile {
  readonly name: string;
  readonly avatarUrl: string | null;
}

const SUPPORT_CHAT_ANONYMOUS_PARTY_LABEL = 'Khách vãng lai';
const SUPPORT_CHAT_ANONYMOUS_SENDER_LABEL = 'Khách';
const SUPPORT_CHAT_AI_SENDER_LABEL = 'VNMIXX AI';
const SUPPORT_CHAT_AI_AVATAR_URL =
  'https://media.vnmixx.shop/AI/1778784999854-5cffc9-cohere-logo.png';

@Injectable()
// Xử lý luồng nghiệp vụ liên quan đến chat hỗ trợ khách hàng.
export class SupportChatService {
  constructor(
    private readonly repository: SupportChatRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

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
    const requiresNumericSender =
      input.senderType === ChatSenderType.CUSTOMER || input.senderType === ChatSenderType.EMPLOYEE;
    if (requiresNumericSender && typeof input.senderId !== 'number') {
      throw new BadRequestException('senderId bắt buộc với CUSTOMER và EMPLOYEE.');
    }
    const isExists = await this.repository.existsById(input.chatId);
    if (!isExists) {
      throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${input.chatId}`);
    }

    const message = await this.repository.createMessage(input);
    const senderProfile =
      input.senderType === ChatSenderType.GUEST || input.senderType === ChatSenderType.AI
        ? this.resolveSystemSenderProfile(input.senderType)
        : await this.resolveSenderProfile(input.senderType, input.senderId as number);

    return this.mapMessage(message, senderProfile);
  }

  // Phân công nhân viên vào hỗ trợ cuộc hội thoại.
  async assignEmployee(
    chatId: number,
    employeeId: number,
    auditContext: AuditRequestContext = {},
  ): Promise<ChatDetailResponseDto> {
    const beforeData = await this.repository.findById(chatId);
    try {
      const isExists = await this.repository.existsById(chatId);
      if (!isExists) {
        throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${chatId}`);
      }

      const existing = await this.repository.findAssignment(chatId, employeeId);
      if (existing) {
        throw new ConflictException('Bạn đã được phân công vào cuộc hội thoại này.');
      }

      await this.repository.createAssignment(chatId, employeeId);
      const detail = await this.getChatDetail(chatId);
      await this.auditLogService.write({
        ...auditContext,
        action: 'support-chat.assign',
        resourceType: 'support-chat',
        resourceId: String(chatId),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
        afterData: detail,
      });
      return detail;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'support-chat.assign',
        resourceType: 'support-chat',
        resourceId: String(chatId),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        afterData: { employeeId },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Lấy chi tiết cuộc hội thoại bao gồm các nhân viên đã được phân công.
  async getChatDetail(chatId: number): Promise<ChatDetailResponseDto> {
    const chat = await this.repository.findById(chatId);
    if (!chat) {
      throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${chatId}`);
    }

    return this.mapChatDetail(chat);
  }

  async updateChatAiMode(
    chatId: number,
    aiMode: SupportChatAiMode,
    auditContext: AuditRequestContext = {},
  ): Promise<ChatDetailResponseDto> {
    const beforeData = await this.repository.findById(chatId);
    try {
      const chat = beforeData;
      if (!chat) {
        throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${chatId}`);
      }

      await this.repository.updateAiState(chatId, {
        aiMode,
        ...(aiMode === SupportChatAiMode.AUTO && chat.status === SupportChatStatus.WAITING_HUMAN
          ? { status: SupportChatStatus.OPEN }
          : {}),
      });

      const detail = await this.getChatDetail(chatId);
      await this.auditLogService.write({
        ...auditContext,
        action: 'support-chat.ai-mode.update',
        resourceType: 'support-chat',
        resourceId: String(chatId),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
        afterData: detail,
      });
      return detail;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'support-chat.ai-mode.update',
        resourceType: 'support-chat',
        resourceId: String(chatId),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        afterData: { aiMode },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Xóa vĩnh viễn một cuộc hội thoại hỗ trợ.
  async deleteChat(chatId: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.repository.findById(chatId);
    try {
      const isExists = await this.repository.existsById(chatId);
      if (!isExists) {
        throw new NotFoundException(`Không tìm thấy cuộc hội thoại #${chatId}`);
      }

      await this.repository.deleteById(chatId);
      await this.auditLogService.write({
        ...auditContext,
        action: 'support-chat.delete',
        resourceType: 'support-chat',
        resourceId: String(chatId),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'support-chat.delete',
        resourceType: 'support-chat',
        resourceId: String(chatId),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
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

    const senderProfiles = await this.resolveSenderProfiles(items);

    return {
      items: items.map((msg) =>
        this.mapMessage(msg, senderProfiles.get(this.buildSenderKey(msg)) ?? null),
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
    const search = query.search?.trim() || undefined;
    const customerType = query.customerType ?? 'all';

    const [total, chats] = await Promise.all([
      this.repository.count(filterEmployeeId, search, customerType),
      this.repository.findMany(
        (page - 1) * pageSize,
        pageSize,
        filterEmployeeId,
        search,
        customerType,
      ),
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

  // Tìm cuộc hội thoại cho guest session hoặc tạo mới.
  async findOrCreateGuestChat(secretHash: string): Promise<ChatDetailResponseDto> {
    const existing = await this.repository.findByGuestSessionSecretHash(secretHash);
    if (existing) return this.mapChatDetail(existing);
    const created = await this.repository.createForGuestSession(secretHash);
    return this.mapChatDetail(created);
  }

  // Kiểm tra xem khách hàng có phải chủ sở hữu của cuộc hội thoại không.
  async isCustomerOwner(chatId: number, customerId: number): Promise<boolean> {
    const chat = await this.repository.findByCustomerId(customerId);
    return chat?.id === chatId;
  }

  // Kiểm tra xem guest có phải chủ sở hữu của cuộc hội thoại không.
  async isGuestOwner(chatId: number, secretHash: string): Promise<boolean> {
    const chat = await this.repository.findByGuestSessionSecretHash(secretHash);
    return chat?.id === chatId;
  }

  // ─── Các hàm hỗ trợ ánh xạ dữ liệu (Mapping) ──────────────────────────

  private mapChatDetail(chat: ChatDetailView): ChatDetailResponseDto {
    return {
      id: chat.id,
      customerId: chat.customerId,
      customerName: chat.customer?.fullName ?? SUPPORT_CHAT_ANONYMOUS_PARTY_LABEL,
      assignments: chat.assignments.map((a) => ({
        employeeId: a.employee.id,
        employeeName: a.employee.fullName,
        assignedAt: a.assignedAt,
      })),
      aiMode: chat.aiMode,
      status: chat.status,
      createdAt: chat.createdAt,
    };
  }

  private mapChatSummary(chat: ChatSummaryView): ChatSummaryResponseDto {
    const lastMessage = chat.messages[0] ?? null;
    const partyName = chat.customer?.fullName ?? SUPPORT_CHAT_ANONYMOUS_PARTY_LABEL;
    return {
      id: chat.id,
      customerId: chat.customerId,
      customerName: partyName,
      customerAvatarUrl: chat.customer?.avatarUrl ?? null,
      customerEmail: chat.customer?.email ?? '',
      customerPhoneNumber: chat.customer?.phoneNumber ?? '',
      lastMessageContent: lastMessage?.content ?? null,
      lastMessageAt: lastMessage?.createdAt ?? null,
      assignedEmployeeNames: chat.assignments.map((a) => a.employee.fullName),
      createdAt: chat.createdAt,
    };
  }

  private mapMessage(
    msg: MessageView,
    senderProfile: SenderProfile | null,
  ): ChatMessageResponseDto {
    return {
      id: msg.id,
      chatId: msg.chatId,
      senderType: msg.senderType as 'CUSTOMER' | 'EMPLOYEE' | 'GUEST' | 'AI',
      senderCustomerId: msg.senderCustomerId,
      senderEmployeeId: msg.senderEmployeeId,
      senderName: senderProfile?.name ?? null,
      senderAvatarUrl: senderProfile?.avatarUrl ?? null,
      content: msg.content,
      createdAt: msg.createdAt,
    };
  }

  private async resolveSenderProfile(
    senderType: ChatSenderType,
    senderId: number,
  ): Promise<SenderProfile | null> {
    if (senderType === ChatSenderType.GUEST || senderType === ChatSenderType.AI) {
      return this.resolveSystemSenderProfile(senderType);
    }
    if (senderType === ChatSenderType.CUSTOMER) {
      const rows = await this.repository.findCustomerNames([senderId]);
      const customer = rows[0];
      if (!customer) return null;
      return { name: customer.fullName, avatarUrl: customer.avatarUrl ?? null };
    }
    const rows = await this.repository.findEmployeeNames([senderId]);
    const employee = rows[0];
    if (!employee) return null;
    return { name: employee.fullName, avatarUrl: employee.avatarUrl ?? null };
  }

  private async resolveSenderProfiles(
    messages: MessageView[],
  ): Promise<Map<string, SenderProfile>> {
    const customerIds = new Set<number>();
    const employeeIds = new Set<number>();
    const profileMap = new Map<string, SenderProfile>();
    for (const msg of messages) {
      if (msg.senderType === ChatSenderType.GUEST) {
        profileMap.set('GUEST', this.resolveSystemSenderProfile(ChatSenderType.GUEST));
      }
      if (msg.senderType === ChatSenderType.AI) {
        profileMap.set('AI', this.resolveSystemSenderProfile(ChatSenderType.AI));
      }
      if (msg.senderType === ChatSenderType.CUSTOMER && msg.senderCustomerId) {
        customerIds.add(msg.senderCustomerId);
      }
      if (msg.senderType === ChatSenderType.EMPLOYEE && msg.senderEmployeeId) {
        employeeIds.add(msg.senderEmployeeId);
      }
    }

    if (customerIds.size > 0) {
      const customers = await this.repository.findCustomerNames([...customerIds]);
      for (const c of customers) {
        profileMap.set(`CUSTOMER:${c.id}`, {
          name: c.fullName,
          avatarUrl: c.avatarUrl ?? null,
        });
      }
    }

    if (employeeIds.size > 0) {
      const employees = await this.repository.findEmployeeNames([...employeeIds]);
      for (const e of employees) {
        profileMap.set(`EMPLOYEE:${e.id}`, {
          name: e.fullName,
          avatarUrl: e.avatarUrl ?? null,
        });
      }
    }

    return profileMap;
  }

  private buildSenderKey(msg: MessageView): string {
    if (msg.senderType === ChatSenderType.GUEST) return 'GUEST';
    if (msg.senderType === ChatSenderType.AI) return 'AI';
    const id =
      msg.senderType === ChatSenderType.CUSTOMER ? msg.senderCustomerId : msg.senderEmployeeId;
    return `${msg.senderType}:${id}`;
  }

  private resolveSystemSenderProfile(senderType: 'GUEST' | 'AI'): SenderProfile {
    return senderType === ChatSenderType.AI
      ? { name: SUPPORT_CHAT_AI_SENDER_LABEL, avatarUrl: SUPPORT_CHAT_AI_AVATAR_URL }
      : { name: SUPPORT_CHAT_ANONYMOUS_SENDER_LABEL, avatarUrl: null };
  }
}
