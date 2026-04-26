import { API_BASE_URL } from '@/config/constants';
import { io, type Socket } from 'socket.io-client';

export type SupportChatSocket = Socket;

function buildSupportChatSocketUrl(): string {
  const apiUrl = new URL(API_BASE_URL);
  return apiUrl.origin;
}

export function createSupportChatSocket(accessToken: string): SupportChatSocket {
  return io(`${buildSupportChatSocketUrl()}/support-chat`, {
    transports: ['websocket'],
    autoConnect: false,
    withCredentials: true,
    auth: {
      token: accessToken,
    },
  });
}
