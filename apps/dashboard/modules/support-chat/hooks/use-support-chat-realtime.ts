'use client';

import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { createSupportChatSocket, type SupportChatSocket } from '@/modules/support-chat/lib/socket';
import { useEffect, useRef, useState } from 'react';

interface UseSupportChatRealtimeOptions {
  readonly chatId: number | null;
  readonly enabled: boolean;
  readonly joinNonce?: number;
  readonly onNewMessage: (payload: unknown) => void;
  readonly onChatAssigned: (payload: unknown) => void;
}

export function useSupportChatRealtime({
  chatId,
  enabled,
  joinNonce = 0,
  onNewMessage,
  onChatAssigned,
}: UseSupportChatRealtimeOptions): SupportChatSocket | null {
  const accessToken = useAuthStore((state) => state.accessToken);
  const socketRef = useRef<SupportChatSocket | null>(null);
  const [socket, setSocket] = useState<SupportChatSocket | null>(null);

  useEffect(() => {
    if (!enabled || !accessToken) return;

    const socket = createSupportChatSocket(accessToken);
    socketRef.current = socket;
    setSocket(socket);
    socket.connect();

    socket.on('newMessage', onNewMessage);
    socket.on('chatAssigned', onChatAssigned);

    return () => {
      socket.off('newMessage', onNewMessage);
      socket.off('chatAssigned', onChatAssigned);
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [accessToken, enabled, onChatAssigned, onNewMessage]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !chatId || !enabled) return;
    socket.emit('joinChat', { chatId });
    return () => {
      socket.emit('leaveChat', { chatId });
    };
  }, [chatId, enabled, joinNonce]);

  return socket;
}
