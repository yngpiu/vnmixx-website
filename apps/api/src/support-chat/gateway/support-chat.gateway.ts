import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatSenderType } from '../../../generated/prisma/client';
import { buildSocketIoCorsOptions } from '../../common/websocket/socket-io-cors';
import type { ChatMessageResponseDto } from '../dto/chat-response.dto';
import { SupportChatService } from '../services/support-chat.service';
import { WsCombinedAuthGuard } from '../ws-combined-auth.guard';

interface JoinChatPayload {
  chatId: number;
}

interface SendMessagePayload {
  chatId: number;
  content: string;
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
export class SupportChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;
  private readonly logger = new Logger(SupportChatGateway.name);

  constructor(private readonly chatService: SupportChatService) {}

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
    const senderId = auth.userType !== 'GUEST' ? auth.userId : undefined;
    const message = await this.chatService.sendMessage({
      chatId: payload.chatId,
      senderType,
      senderId,
      content: payload.content.trim(),
    });
    const roomName = this.buildRoomName(payload.chatId);
    this.server.to(roomName).emit('newMessage', message);
    return message;
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
}
