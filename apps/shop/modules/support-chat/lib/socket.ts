import { API_BASE_URL } from '@/config/constants';
import { io, type Socket } from 'socket.io-client';

export type SupportChatSocket = Socket;

function buildSupportChatSocketOrigin(): string {
  const apiUrl = new URL(API_BASE_URL);
  return apiUrl.origin;
}

/** Socket.IO client for namespace `/support-chat` (auth via `handshake.auth.token`). */
export function createSupportChatSocket(accessToken: string): SupportChatSocket {
  return io(`${buildSupportChatSocketOrigin()}/support-chat`, {
    transports: ['websocket'],
    autoConnect: false,
    withCredentials: true,
    auth: {
      token: accessToken,
    },
  });
}
