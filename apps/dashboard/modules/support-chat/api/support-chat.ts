import { apiClient } from '@/lib/axios';
import type {
  AdminChatsQuery,
  AdminChatsResponse,
  ChatDetail,
  MessagesQuery,
  MessagesResponse,
} from '@/modules/support-chat/types/support-chat';

export async function listAdminChats(params: AdminChatsQuery): Promise<AdminChatsResponse> {
  const { data } = await apiClient.get<AdminChatsResponse>('/admin/support-chats', { params });
  return data;
}

export async function getAdminChatDetail(chatId: number): Promise<ChatDetail> {
  const { data } = await apiClient.get<ChatDetail>(`/admin/support-chats/${chatId}`);
  return data;
}

export async function listAdminChatMessages(
  chatId: number,
  params: MessagesQuery,
): Promise<MessagesResponse> {
  const { data } = await apiClient.get<MessagesResponse>(
    `/admin/support-chats/${chatId}/messages`,
    {
      params,
    },
  );
  return data;
}

export async function assignSelfToChat(chatId: number): Promise<ChatDetail> {
  const { data } = await apiClient.post<ChatDetail>(`/admin/support-chats/${chatId}/assign`);
  return data;
}
