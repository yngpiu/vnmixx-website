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
    const nextSocket = createSupportChatSocket(accessToken);
    socketRef.current = nextSocket;
    setSocket(nextSocket);
    nextSocket.connect();
    nextSocket.on('newMessage', onNewMessage);
    nextSocket.on('chatAssigned', onChatAssigned);
    return () => {
      nextSocket.off('newMessage', onNewMessage);
      nextSocket.off('chatAssigned', onChatAssigned);
      nextSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [accessToken, enabled, onChatAssigned, onNewMessage]);
  useEffect(() => {
    const activeSocket = socketRef.current;
    if (!activeSocket || !chatId || !enabled) return;
    activeSocket.emit('joinChat', { chatId });
    return () => {
      activeSocket.emit('leaveChat', { chatId });
    };
  }, [chatId, enabled, joinNonce]);
  return socket;
}
