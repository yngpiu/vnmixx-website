import { apiClient } from '@/lib/axios';
import type {
  ChatDetail,
  MessagesQuery,
  MessagesResponse,
} from '@/modules/support-chat/types/support-chat';

export async function findOrCreateSupportChat(): Promise<ChatDetail> {
  const { data } = await apiClient.post<ChatDetail>('/me/support-chats');
  return data;
}

export async function listSupportChatMessages(
  chatId: number,
  params?: MessagesQuery,
): Promise<MessagesResponse> {
  const { data } = await apiClient.get<MessagesResponse>(`/me/support-chats/${chatId}/messages`, {
    params: {
      ...(params?.cursor != null ? { cursor: params.cursor } : {}),
      ...(params?.limit != null ? { limit: params.limit } : {}),
    },
  });
  return data;
}
