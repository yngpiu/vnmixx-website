import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../../support-chat/ws-jwt.guard';
import { OrderRepository } from '../repositories/order.repository';

interface ClientAuthData {
  userId: number;
  userType: 'CUSTOMER' | 'EMPLOYEE';
}

interface WatchOrderPaymentPayload {
  orderCode: string;
}

@WebSocketGateway({
  namespace: '/order-payment',
  cors: { origin: '*', credentials: true },
})
export class OrderPaymentGateway {
  @WebSocketServer()
  private readonly server!: Server;
  private readonly logger = new Logger(OrderPaymentGateway.name);

  constructor(private readonly orderRepo: OrderRepository) {}

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('watchOrderPayment')
  async handleWatchOrderPayment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WatchOrderPaymentPayload,
  ): Promise<{ orderCode: string }> {
    const auth = client.data as ClientAuthData;
    if (auth.userType !== 'CUSTOMER') {
      throw new WsException('Chỉ khách hàng mới có thể theo dõi trạng thái thanh toán đơn hàng.');
    }
    const order = await this.orderRepo.findByOrderCode(payload.orderCode, auth.userId);
    if (!order) {
      throw new WsException('Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập.');
    }
    const roomName = this.buildRoomName(auth.userId, payload.orderCode);
    await client.join(roomName);
    this.logger.log(`CUSTOMER:${auth.userId} joined room ${roomName}`);
    return { orderCode: payload.orderCode };
  }

  emitOrderPaymentUpdated(customerId: number, orderCode: string, paymentStatus: string): void {
    const roomName = this.buildRoomName(customerId, orderCode);
    this.server.to(roomName).emit('orderPaymentUpdated', {
      orderCode,
      paymentStatus,
    });
  }

  private buildRoomName(customerId: number, orderCode: string): string {
    return `order-payment:${customerId}:${orderCode}`;
  }
}
