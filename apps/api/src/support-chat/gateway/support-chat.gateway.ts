import { InjectQueue } from '@nestjs/bullmq';
import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Queue } from 'bullmq';
import { Server, Socket } from 'socket.io';
import { ChatSenderType, SupportChatAiMode } from '../../../generated/prisma/client';
import { buildSocketIoCorsOptions } from '../../common/websocket/socket-io-cors';
import type { ChatMessageResponseDto } from '../dto/chat-response.dto';
import { SupportChatAiProcessor } from '../processors/support-chat-ai.processor';
import { SupportChatRepository } from '../repositories/support-chat.repository';
import { SupportChatService } from '../services/support-chat.service';
import { SUPPORT_CHAT_AI_JOB, SUPPORT_CHAT_AI_QUEUE } from '../support-chat.constants';
import { WsCombinedAuthGuard } from '../ws-combined-auth.guard';

interface JoinChatPayload {
  chatId: number;
}

interface SendMessagePayload {
  chatId: number;
  content: string;
}

interface TypingPayload {
  chatId: number;
  isTyping: boolean;
}

interface StopAiResponsePayload {
  chatId: number;
}

interface ChatTypingEventPayload {
  chatId: number;
  isTyping: boolean;
  senderType: 'CUSTOMER' | 'EMPLOYEE' | 'GUEST';
  senderCustomerId: number | null;
  senderEmployeeId: number | null;
}

type ClientAuthData =
  | { userType: 'CUSTOMER'; userId: number }
  | { userType: 'EMPLOYEE'; userId: number }
  | { userType: 'GUEST'; guestSecretHash: string };

/**
 * SupportChatGateway: WebSocket Gateway cho hệ thống hỗ trợ trực tuyến.
 * Sử dụng Socket.IO với namespace `/support-chat`.
 * Xử lý kết nối, xác thực JWT, join room, gửi/nhận tin nhắn real-time.
 */
@WebSocketGateway({
  namespace: '/support-chat',
  path: '/socket.io',
  cors: buildSocketIoCorsOptions(),
})
export class SupportChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  private readonly server!: Server;
  private readonly logger = new Logger(SupportChatGateway.name);

  constructor(
    private readonly chatService: SupportChatService,
    private readonly chatRepo: SupportChatRepository,
    private readonly aiProcessor: SupportChatAiProcessor,
    @InjectQueue(SUPPORT_CHAT_AI_QUEUE) private readonly aiQueue: Queue,
  ) {}

  /** Give processor access to Socket.IO server for emitting events. */
  afterInit(server: Server): void {
    this.aiProcessor.setServer(server);
  }

  /** Ghi log khi client kết nối. */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /** Ghi log khi client ngắt kết nối. */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client join vào room chat cụ thể.
   * Kiểm tra quyền: khách chỉ join được cuộc hội thoại của mình, nhân viên phải được phân công.
   */
  @UseGuards(WsCombinedAuthGuard)
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinChatPayload,
  ): Promise<{ chatId: number }> {
    const auth = client.data as ClientAuthData;
    await this.assertChatAccess(auth, payload.chatId);
    const roomName = this.buildRoomName(payload.chatId);
    await client.join(roomName);
    if (this.aiProcessor.isChatResponding(payload.chatId)) {
      client.emit('ai:thinking', { chatId: payload.chatId, isThinking: true });
    }
    const authLabel = auth.userType === 'GUEST' ? 'GUEST' : `${auth.userType}:${auth.userId}`;
    this.logger.log(`${authLabel} joined room ${roomName}`);
    return { chatId: payload.chatId };
  }

  /**
   * Client rời room chat.
   */
  @UseGuards(WsCombinedAuthGuard)
  @SubscribeMessage('leaveChat')
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinChatPayload,
  ): Promise<{ chatId: number }> {
    const roomName = this.buildRoomName(payload.chatId);
    await client.leave(roomName);
    this.logger.log(`Client ${client.id} left room ${roomName}`);
    return { chatId: payload.chatId };
  }

  /**
   * Client gửi tin nhắn. Lưu vào DB rồi broadcast cho toàn bộ room.
   */
  @UseGuards(WsCombinedAuthGuard)
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<ChatMessageResponseDto> {
    const auth = client.data as ClientAuthData;
    if (!payload.content?.trim()) {
      throw new WsException('Nội dung tin nhắn không được để trống');
    }
    if (payload.content.length > 2000) {
      throw new WsException('Nội dung tin nhắn tối đa 2000 ký tự');
    }
    await this.assertChatAccess(auth, payload.chatId);
    const senderType = this.resolveSenderType(auth);
    const isCustomerOrGuest =
      senderType === ChatSenderType.CUSTOMER || senderType === ChatSenderType.GUEST;
    let chatCtx: { id: number; aiMode: SupportChatAiMode; status: string } | null = null;
    if (isCustomerOrGuest) {
      chatCtx = await this.chatRepo.findChatAiContext(payload.chatId);
      if (
        chatCtx?.aiMode === SupportChatAiMode.AUTO &&
        this.aiProcessor.isChatResponding(payload.chatId)
      ) {
        this.logger.log(`[chat ${payload.chatId}] Blocked sendMessage: AI is still responding`);
        throw new WsException('AI đang trả lời, vui lòng chờ hoặc nhấn Dừng để gửi câu hỏi mới');
      }
    }
    const senderId = auth.userType !== 'GUEST' ? auth.userId : undefined;
    const message = await this.chatService.sendMessage({
      chatId: payload.chatId,
      senderType,
      senderId,
      content: payload.content.trim(),
    });
    const roomName = this.buildRoomName(payload.chatId);
    this.server.to(roomName).emit('newMessage', message);

    // Enqueue AI response if sender is customer/guest and AI mode is AUTO
    if (isCustomerOrGuest) {
      if (chatCtx?.aiMode === SupportChatAiMode.AUTO) {
        const jobId = `ai-respond-${payload.chatId}`;
        // Remove any existing queued (not yet started) job to deduplicate
        await this.aiQueue.remove(jobId).catch(() => null);
        await this.aiQueue.add(
          SUPPORT_CHAT_AI_JOB,
          { chatId: payload.chatId },
          { jobId, removeOnComplete: true, removeOnFail: 50 },
        );
        this.logger.log(`[chat ${payload.chatId}] Enqueued AI job ${jobId}`);
        this.aiProcessor.markChatResponding(payload.chatId);
        this.server.to(roomName).emit('ai:thinking', { chatId: payload.chatId, isThinking: true });
      }
    }

    return message;
  }

  @UseGuards(WsCombinedAuthGuard)
  @SubscribeMessage('stopAiResponse')
  async handleStopAiResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StopAiResponsePayload,
  ): Promise<{ chatId: number; stopped: boolean }> {
    const auth = client.data as ClientAuthData;
    if (!Number.isInteger(payload.chatId) || payload.chatId <= 0) {
      throw new WsException('chatId không hợp lệ');
    }
    await this.assertChatAccess(auth, payload.chatId);
    if (auth.userType === 'EMPLOYEE') {
      throw new WsException('Chỉ khách hàng mới có thể dừng phản hồi AI');
    }
    const chatCtx = await this.chatRepo.findChatAiContext(payload.chatId);
    if (chatCtx?.aiMode !== SupportChatAiMode.AUTO) {
      return { chatId: payload.chatId, stopped: false };
    }
    const stopped = await this.aiProcessor.cancelChatResponse(payload.chatId);
    this.logger.log(`[chat ${payload.chatId}] stopAiResponse requested, stopped=${stopped}`);
    this.server.to(this.buildRoomName(payload.chatId)).emit('ai:thinking', {
      chatId: payload.chatId,
      isThinking: false,
    });
    return { chatId: payload.chatId, stopped };
  }

  @UseGuards(WsCombinedAuthGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload,
  ): Promise<{ chatId: number; isTyping: boolean }> {
    const auth = client.data as ClientAuthData;
    if (!Number.isInteger(payload.chatId) || payload.chatId <= 0) {
      throw new WsException('chatId không hợp lệ');
    }
    if (typeof payload.isTyping !== 'boolean') {
      throw new WsException('isTyping phải là boolean');
    }
    await this.assertChatAccess(auth, payload.chatId);
    const roomName = this.buildRoomName(payload.chatId);
    client.to(roomName).emit('typing', this.buildTypingEventPayload(auth, payload));
    return { chatId: payload.chatId, isTyping: payload.isTyping };
  }

  /**
   * Emit sự kiện `chatAssigned` khi một nhân viên được phân công.
   * Được gọi từ Controller sau khi assign thành công.
   */
  emitChatAssigned(chatId: number, data: unknown): void {
    const roomName = this.buildRoomName(chatId);
    this.server.to(roomName).emit('chatAssigned', data);
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private async assertChatAccess(auth: ClientAuthData, chatId: number): Promise<void> {
    if (auth.userType === 'CUSTOMER') {
      const isOwner = await this.chatService.isCustomerOwner(chatId, auth.userId);
      if (!isOwner) throw new WsException('Bạn không có quyền truy cập cuộc hội thoại này');
    } else if (auth.userType === 'GUEST') {
      const isOwner = await this.chatService.isGuestOwner(chatId, auth.guestSecretHash);
      if (!isOwner) throw new WsException('Bạn không có quyền truy cập cuộc hội thoại này');
    } else {
      const isAssigned = await this.chatService.isEmployeeAssigned(chatId, auth.userId);
      if (!isAssigned) throw new WsException('Bạn chưa được phân công vào cuộc hội thoại này');
    }
  }

  private resolveSenderType(auth: ClientAuthData): ChatSenderType {
    const senderTypeMap: Record<string, ChatSenderType> = {
      CUSTOMER: ChatSenderType.CUSTOMER,
      EMPLOYEE: ChatSenderType.EMPLOYEE,
      GUEST: ChatSenderType.GUEST,
    };
    return senderTypeMap[auth.userType] ?? ChatSenderType.GUEST;
  }

  private buildRoomName(chatId: number): string {
    return `chat:${chatId}`;
  }

  private buildTypingEventPayload(
    auth: ClientAuthData,
    payload: TypingPayload,
  ): ChatTypingEventPayload {
    if (auth.userType === 'CUSTOMER') {
      return {
        chatId: payload.chatId,
        isTyping: payload.isTyping,
        senderType: 'CUSTOMER',
        senderCustomerId: auth.userId,
        senderEmployeeId: null,
      };
    }
    if (auth.userType === 'EMPLOYEE') {
      return {
        chatId: payload.chatId,
        isTyping: payload.isTyping,
        senderType: 'EMPLOYEE',
        senderCustomerId: null,
        senderEmployeeId: auth.userId,
      };
    }
    return {
      chatId: payload.chatId,
      isTyping: payload.isTyping,
      senderType: 'GUEST',
      senderCustomerId: null,
      senderEmployeeId: null,
    };
  }
}
