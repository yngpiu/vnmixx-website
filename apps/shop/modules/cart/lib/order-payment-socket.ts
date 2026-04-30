import { API_BASE_URL } from '@/config/constants';
import { io, type Socket } from 'socket.io-client';

export interface OrderPaymentUpdatedEvent {
  orderCode: string;
  paymentStatus: string;
}

export type OrderPaymentSocket = Socket;

function buildOrderPaymentSocketOrigin(): string {
  const apiUrl = new URL(API_BASE_URL);
  return apiUrl.origin;
}

export function createOrderPaymentSocket(accessToken: string): OrderPaymentSocket {
  return io(`${buildOrderPaymentSocketOrigin()}/order-payment`, {
    transports: ['websocket'],
    autoConnect: false,
    withCredentials: true,
    auth: {
      token: accessToken,
    },
  });
}
