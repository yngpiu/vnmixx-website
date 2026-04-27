'use client';

import type { ChatMessage, ChatSummary } from '@/modules/support-chat/types/support-chat';
import { isAxiosError } from 'axios';
import { format, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';

export const CHAT_IMAGES_START = '[chat-images]';
export const CHAT_IMAGES_END = '[/chat-images]';
export const TIMESTAMP_BOUNDARY_MS = 5 * 60 * 1000;
export const SUPPORT_CHATS_LIST_QUERY = ['admin', 'support-chats', 'list'] as const;

const IMAGE_URL_PATTERN = /^(https?:\/\/|blob:|data:image\/)/i;

export type SupportChatsListCache = {
  items: ChatSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function buildMessagePayload(text: string, imageUrls: string[]): string {
  const trimmed = text.trim();
  if (imageUrls.length === 0) return trimmed;
  return `${CHAT_IMAGES_START}\n${imageUrls.join('\n')}\n${CHAT_IMAGES_END}\n${trimmed}`.trim();
}

export function parseMessagePayload(rawContent: string): { text: string; imageUrls: string[] } {
  if (!rawContent.includes(CHAT_IMAGES_START)) {
    return { text: rawContent, imageUrls: [] };
  }
  const start = rawContent.indexOf(CHAT_IMAGES_START);
  const end = rawContent.indexOf(CHAT_IMAGES_END);
  if (start === -1 || end === -1 || end <= start) {
    return { text: rawContent, imageUrls: [] };
  }
  const imageBlock = rawContent
    .slice(start + CHAT_IMAGES_START.length, end)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => IMAGE_URL_PATTERN.test(line));
  const text = rawContent.slice(end + CHAT_IMAGES_END.length).trim();
  return { text, imageUrls: imageBlock };
}

export function apiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string | string[] } | undefined;
    if (typeof responseData?.message === 'string') return responseData.message;
    if (Array.isArray(responseData?.message)) return responseData.message.join(', ');
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi.';
}

export function formatMessageTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const safeDiffMs = Number.isFinite(diffMs) ? Math.max(0, diffMs) : 0;

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;
  const yearMs = 52 * weekMs;

  if (safeDiffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(safeDiffMs / minuteMs));
    return `${minutes} phút`;
  }
  if (safeDiffMs < dayMs) {
    const hours = Math.max(1, Math.floor(safeDiffMs / hourMs));
    return `${hours} giờ`;
  }
  if (safeDiffMs < weekMs) {
    const days = Math.max(1, Math.floor(safeDiffMs / dayMs));
    return `${days} ngày`;
  }
  if (safeDiffMs < yearMs) {
    const weeks = Math.max(1, Math.floor(safeDiffMs / weekMs));
    return `${weeks} tuần`;
  }

  const years = Math.max(1, Math.floor(safeDiffMs / yearMs));
  return `${years} năm`;
}

export function formatBoundaryTimestamp(current: string, previous?: string): string {
  const currentDate = new Date(current);
  if (isToday(currentDate)) {
    return format(currentDate, 'HH:mm', { locale: vi });
  }
  if (isYesterday(currentDate)) {
    return `Hôm qua ${format(currentDate, 'HH:mm', { locale: vi })}`;
  }

  void previous;
  return format(currentDate, 'HH:mm dd/MM/yy', { locale: vi });
}

export function formatFullTooltipTime(value: string): string {
  const date = new Date(value);
  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: vi });
  }
  if (isYesterday(date)) {
    return `Hôm qua ${format(date, 'HH:mm', { locale: vi })}`;
  }
  return format(date, 'HH:mm dd/MM/yy', { locale: vi });
}

export function shortDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

export function senderInitial(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function patchSupportChatListCache(
  previous: SupportChatsListCache | undefined,
  message: ChatMessage,
): SupportChatsListCache | undefined {
  if (!previous) return previous;
  const parsed = parseMessagePayload(message.content);
  const target = previous.items.find((item) => item.id === message.chatId);
  if (!target) return previous;
  const senderLabel =
    message.senderType === 'EMPLOYEE' ? 'VNMIXX' : shortDisplayName(target.customerName);
  const snippet =
    parsed.text ||
    (parsed.imageUrls.length > 0
      ? `${senderLabel} đã gửi ${parsed.imageUrls.length} ảnh`
      : 'Chưa có tin nhắn');
  const patched: ChatSummary = {
    ...target,
    lastMessageContent: snippet,
    lastMessageAt: message.createdAt,
  };
  return {
    ...previous,
    items: [patched, ...previous.items.filter((item) => item.id !== message.chatId)],
  };
}
