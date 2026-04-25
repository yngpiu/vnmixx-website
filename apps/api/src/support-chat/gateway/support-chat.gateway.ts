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
import type { ChatMessageResponseDto } from '../dto/chat-response.dto';
import { SupportChatService } from '../services/support-chat.service';
import { WsJwtGuard } from '../ws-jwt.guard';

interface JoinChatPayload {
  chatId: number;
}

interface SendMessagePayload {
  chatId: number;
  content: string;
}

interface ClientAuthData {
  userId: number;
  userType: 'CUSTOMER' | 'EMPLOYEE';
}

/**
 * SupportChatGateway: WebSocket Gateway cho hệ thống chat hỗ trợ khách hàng.
 * Sử dụng Socket.IO với namespace `/support-chat`.
 * Xử lý kết nối, xác thực JWT, join room, gửi/nhận tin nhắn real-time.
 */
@WebSocketGateway({
  namespace: '/support-chat',
  cors: { origin: '*', credentials: true },
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
   * Kiểm tra quyền: khách chỉ join được chat của mình, nhân viên phải được phân công.
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinChatPayload,
  ): Promise<{ chatId: number }> {
    const auth = client.data as ClientAuthData;
    await this.assertChatAccess(auth, payload.chatId);
    const roomName = this.buildRoomName(payload.chatId);
    await client.join(roomName);
    this.logger.log(`${auth.userType}:${auth.userId} joined room ${roomName}`);
    return { chatId: payload.chatId };
  }

  /**
   * Client rời room chat.
   */
  @UseGuards(WsJwtGuard)
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
  @UseGuards(WsJwtGuard)
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
    const senderType =
      auth.userType === 'CUSTOMER' ? ChatSenderType.CUSTOMER : ChatSenderType.EMPLOYEE;
    const message = await this.chatService.sendMessage({
      chatId: payload.chatId,
      senderType,
      senderId: auth.userId,
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
    } else {
      const isAssigned = await this.chatService.isEmployeeAssigned(chatId, auth.userId);
      if (!isAssigned) throw new WsException('Bạn chưa được phân công vào cuộc hội thoại này');
    }
  }

  private buildRoomName(chatId: number): string {
    return `chat:${chatId}`;
  }
}
