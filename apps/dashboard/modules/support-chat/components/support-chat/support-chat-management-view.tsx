'use client';

import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { ListPage } from '@/modules/common/components/list-page';
import { uploadMedia } from '@/modules/media/api/media';
import {
  assignSelfToChat,
  getAdminChatDetail,
  listAdminChatMessages,
  listAdminChats,
} from '@/modules/support-chat/api/support-chat';
import { useSupportChatRealtime } from '@/modules/support-chat/hooks/use-support-chat-realtime';
import type { ChatMessage, ChatSummary } from '@/modules/support-chat/types/support-chat';
import { Avatar, AvatarFallback } from '@repo/ui/components/ui/avatar';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@repo/ui/components/ui/dialog';
import { Input } from '@repo/ui/components/ui/input';
import { ScrollArea } from '@repo/ui/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ImageIcon,
  Loader2Icon,
  MessageCircleIcon,
  SearchIcon,
  SendHorizonalIcon,
  UserRoundCheckIcon,
  XIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const CHAT_IMAGES_START = '[chat-images]';
const CHAT_IMAGES_END = '[/chat-images]';
const TIMESTAMP_BOUNDARY_MS = 5 * 60 * 1000;
const SUPPORT_CHATS_LIST_QUERY = [
  'admin',
  'support-chats',
  'list',
  { page: 1, pageSize: 50 },
] as const;
const IMAGE_URL_PATTERN = /^(https?:\/\/|blob:|data:image\/)/i;

type SupportChatsListCache = {
  items: ChatSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function buildMessagePayload(text: string, imageUrls: string[]): string {
  const trimmed = text.trim();
  if (imageUrls.length === 0) return trimmed;
  return `${CHAT_IMAGES_START}\n${imageUrls.join('\n')}\n${CHAT_IMAGES_END}\n${trimmed}`.trim();
}

function parseMessagePayload(rawContent: string): { text: string; imageUrls: string[] } {
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

function apiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string | string[] } | undefined;
    if (typeof responseData?.message === 'string') return responseData.message;
    if (Array.isArray(responseData?.message)) return responseData.message.join(', ');
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi.';
}

function formatMessageTime(value: string): string {
  return format(new Date(value), 'HH:mm', { locale: vi });
}

function formatMessageDate(value: string): string {
  return format(new Date(value), 'dd/MM/yyyy', { locale: vi });
}

function formatBoundaryTimestamp(current: string, previous?: string): string {
  const currentDate = new Date(current);
  if (!previous) {
    return format(currentDate, 'HH:mm dd/MM/yy', { locale: vi });
  }
  if (formatMessageDate(current) === formatMessageDate(previous)) {
    return format(currentDate, 'HH:mm', { locale: vi });
  }
  return format(currentDate, 'HH:mm dd/MM/yy', { locale: vi });
}

function formatFullTooltipTime(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (format(date, 'dd/MM/yyyy', { locale: vi }) === format(today, 'dd/MM/yyyy', { locale: vi })) {
    return format(date, 'HH:mm', { locale: vi });
  }
  return format(date, 'HH:mm dd/MM/yy', { locale: vi });
}

function patchSupportChatListCache(
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

function senderInitial(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function shortDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

export function SupportChatManagementView(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [keyword, setKeyword] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [lastMessageSenderByChatId, setLastMessageSenderByChatId] = useState<
    Record<number, 'CUSTOMER' | 'EMPLOYEE'>
  >({});
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [scrollToBottomTick, setScrollToBottomTick] = useState(0);
  const [joinNonce, setJoinNonce] = useState(0);
  const optimisticIdRef = useRef(-1);
  const optimisticImageUrlsRef = useRef(new Map<number, string[]>());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const canRead = user?.permissions.includes('support-chat.read') ?? false;
  const canAssign = user?.permissions.includes('support-chat.create') ?? false;
  const employeeId = user?.userType === 'EMPLOYEE' ? user.id : null;

  const chatsQuery = useQuery({
    queryKey: SUPPORT_CHATS_LIST_QUERY,
    queryFn: () => listAdminChats({ page: 1, pageSize: 50 }),
    enabled: canRead,
    staleTime: 10_000,
  });

  const selectedChatSummary = useMemo<ChatSummary | null>(() => {
    if (!selectedChatId) return null;
    return chatsQuery.data?.items.find((item) => item.id === selectedChatId) ?? null;
  }, [chatsQuery.data?.items, selectedChatId]);

  const filteredChats = useMemo(() => {
    const source = chatsQuery.data?.items ?? [];
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return source;
    return source.filter((item) => item.customerName.toLowerCase().includes(normalized));
  }, [chatsQuery.data?.items, keyword]);

  const detailQuery = useQuery({
    queryKey: ['admin', 'support-chats', 'detail', selectedChatId],
    queryFn: () => getAdminChatDetail(selectedChatId as number),
    enabled: canRead && selectedChatId !== null,
  });

  const messagesQuery = useInfiniteQuery({
    queryKey: ['admin', 'support-chats', 'messages', selectedChatId],
    queryFn: ({ pageParam }) =>
      listAdminChatMessages(selectedChatId as number, {
        cursor: pageParam ?? undefined,
        limit: 30,
      }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : null),
    enabled: canRead && selectedChatId !== null,
  });

  const selectedChatIsAssigned = useMemo(() => {
    if (!detailQuery.data || !employeeId) return false;
    return detailQuery.data.assignments.some((assignment) => assignment.employeeId === employeeId);
  }, [detailQuery.data, employeeId]);

  const refreshChatData = useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SUPPORT_CHATS_LIST_QUERY, exact: true }),
      selectedChatId
        ? queryClient.invalidateQueries({
            queryKey: ['admin', 'support-chats', 'detail', selectedChatId],
          })
        : Promise.resolve(),
    ]);
  }, [queryClient, selectedChatId]);

  const assignMutation = useMutation({
    mutationFn: (chatId: number) => assignSelfToChat(chatId),
    onSuccess: async (chat) => {
      toast.success('Đã nhận cuộc hội thoại.');
      queryClient.setQueryData(['admin', 'support-chats', 'detail', chat.id], chat);
      setJoinNonce((value) => value + 1);
      await refreshChatData();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });
  const uploadImagesMutation = useMutation({
    mutationFn: (files: File[]) => uploadMedia(files, 'support-chats'),
  });

  const onNewMessage = useCallback(
    (payload: unknown): void => {
      const message = payload as ChatMessage;
      if (!selectedChatId || message.chatId !== selectedChatId) return;
      setOptimisticMessages((previous) => {
        const incomingParsed = parseMessagePayload(message.content);
        const targetIndex = previous.findIndex((item) => {
          if (item.senderEmployeeId !== employeeId || item.chatId !== message.chatId) return false;
          const optimisticParsed = parseMessagePayload(item.content);
          if (incomingParsed.imageUrls.length > 0) {
            return item.id < 0 && optimisticParsed.imageUrls.length > 0;
          }
          return optimisticParsed.text === incomingParsed.text;
        });
        if (targetIndex === -1) return previous;
        const targetMessage = previous[targetIndex];
        if (targetMessage && targetMessage.id < 0) {
          const urls = optimisticImageUrlsRef.current.get(targetMessage.id);
          if (urls) {
            urls.forEach((url) => URL.revokeObjectURL(url));
            optimisticImageUrlsRef.current.delete(targetMessage.id);
          }
        }
        return previous.filter((_, index) => index !== targetIndex);
      });
      setRealtimeMessages((previous) => {
        if (previous.some((item) => item.id === message.id)) return previous;
        return [...previous, message];
      });
      setLastMessageSenderByChatId((previous) => ({
        ...previous,
        [message.chatId]: message.senderType,
      }));
      queryClient.setQueryData<SupportChatsListCache | undefined>(
        SUPPORT_CHATS_LIST_QUERY,
        (previous) => patchSupportChatListCache(previous, message),
      );
      setScrollToBottomTick((tick) => tick + 1);
    },
    [employeeId, queryClient, selectedChatId],
  );

  const onChatAssigned = useCallback(
    (payload: unknown): void => {
      const detail = payload as { id?: number };
      if (typeof detail.id === 'number') {
        void queryClient.invalidateQueries({
          queryKey: ['admin', 'support-chats', 'detail', detail.id],
        });
      }
    },
    [queryClient],
  );

  const socket = useSupportChatRealtime({
    chatId: selectedChatId,
    enabled: canRead && selectedChatId !== null,
    joinNonce,
    onNewMessage,
    onChatAssigned,
  });

  const messages = useMemo(() => {
    const history = messagesQuery.data?.pages.flatMap((page) => page.items) ?? [];
    const merged = [...history, ...realtimeMessages, ...optimisticMessages];
    const deduped = new Map<number, ChatMessage>();
    for (const message of merged) deduped.set(message.id, message);
    return [...deduped.values()].sort((a, b) => {
      const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.id - b.id;
    });
  }, [messagesQuery.data?.pages, optimisticMessages, realtimeMessages]);

  const timelineMessages = useMemo(() => {
    return messages.map((message, index) => {
      const previous = index > 0 ? messages[index - 1] : undefined;
      const showBoundaryTimestamp =
        !previous ||
        new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() >=
          TIMESTAMP_BOUNDARY_MS;
      return {
        message,
        parsed: parseMessagePayload(message.content),
        showBoundaryTimestamp,
        boundaryLabel: showBoundaryTimestamp
          ? formatBoundaryTimestamp(message.createdAt, previous?.createdAt)
          : null,
      };
    });
  }, [messages]);
  const selectedImagePreviews = useMemo(
    () => selectedImages.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    [selectedImages],
  );

  const handleSelectChat = (chatId: number): void => {
    setSelectedChatId(chatId);
    setRealtimeMessages([]);
    setOptimisticMessages([]);
    setDraft('');
    setSelectedImages([]);
    setScrollToBottomTick((tick) => tick + 1);
  };

  const pushOptimisticMessage = useCallback(
    (content: string): number | null => {
      if (!selectedChatId || !employeeId) return null;
      const tempId = optimisticIdRef.current;
      optimisticIdRef.current -= 1;
      setOptimisticMessages((previous) => [
        ...previous,
        {
          id: tempId,
          chatId: selectedChatId,
          senderType: 'EMPLOYEE',
          senderCustomerId: null,
          senderEmployeeId: employeeId,
          senderName: user?.fullName ?? null,
          content,
          createdAt: new Date().toISOString(),
        },
      ]);
      return tempId;
    },
    [employeeId, selectedChatId, user?.fullName],
  );

  const handleSendMessage = async (): Promise<void> => {
    if (!socket || !selectedChatId) return;
    const textContent = draft.trim();
    const imagesToSend = selectedImages;
    if (!textContent && imagesToSend.length === 0) return;
    setDraft('');
    setSelectedImages([]);
    setScrollToBottomTick((tick) => tick + 1);
    if (textContent) {
      setLastMessageSenderByChatId((previous) => ({ ...previous, [selectedChatId]: 'EMPLOYEE' }));
      pushOptimisticMessage(textContent);
      socket.emit('sendMessage', { chatId: selectedChatId, content: textContent });
    }

    if (imagesToSend.length > 0) {
      setLastMessageSenderByChatId((previous) => ({ ...previous, [selectedChatId]: 'EMPLOYEE' }));
      const localImageUrls = selectedImagePreviews.map((item) => item.previewUrl);
      const optimisticImageContent = buildMessagePayload('', localImageUrls);
      const optimisticImageId = pushOptimisticMessage(optimisticImageContent);
      if (optimisticImageId !== null) {
        optimisticImageUrlsRef.current.set(optimisticImageId, localImageUrls);
      }
      setScrollToBottomTick((tick) => tick + 1);

      void uploadImagesMutation
        .mutateAsync(imagesToSend)
        .then((uploaded) => {
          const uploadedUrls = uploaded.map((file) => file.url);
          const imageContent = buildMessagePayload('', uploadedUrls);
          socket.emit('sendMessage', { chatId: selectedChatId, content: imageContent });
        })
        .catch((error) => {
          if (optimisticImageId !== null) {
            setOptimisticMessages((previous) =>
              previous.filter((item) => !(item.id === optimisticImageId)),
            );
            const urls = optimisticImageUrlsRef.current.get(optimisticImageId);
            if (urls) {
              urls.forEach((url) => URL.revokeObjectURL(url));
              optimisticImageUrlsRef.current.delete(optimisticImageId);
            }
          }
          toast.error(apiErrorMessage(error));
        });
    }
  };

  useEffect(() => {
    if (!selectedChatId) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, scrollToBottomTick, selectedChatId]);
  useEffect(() => {
    const optimisticUrls = new Set(
      Array.from(optimisticImageUrlsRef.current.values()).flatMap((urls) => urls),
    );
    return () => {
      for (const item of selectedImagePreviews) {
        if (!optimisticUrls.has(item.previewUrl)) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
  }, [selectedImagePreviews]);
  useEffect(() => {
    const optimisticImages = optimisticImageUrlsRef.current;
    return () => {
      optimisticImages.forEach((urls) => urls.forEach((url) => URL.revokeObjectURL(url)));
      optimisticImages.clear();
    };
  }, []);

  if (!canRead) {
    return (
      <ListPage title="Tin nhắn hỗ trợ">
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Bạn chưa có quyền `support-chat.read` để truy cập module này.
        </div>
      </ListPage>
    );
  }

  return (
    <ListPage title="Tin nhắn hỗ trợ">
      <section className="grid h-[calc(100dvh-10.5rem)] min-h-[560px] gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex min-h-0 flex-col rounded-xl border bg-card">
          <div className="space-y-3 border-b p-4">
            <label className="flex h-10 items-center rounded-md border border-input ps-2">
              <SearchIcon size={15} className="me-2 stroke-slate-500" />
              <span className="sr-only">Tìm hội thoại</span>
              <input
                type="text"
                className="w-full flex-1 bg-transparent text-sm outline-none"
                placeholder="Tìm theo tên khách hàng..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{filteredChats.length} hội thoại</span>
              <Badge variant="secondary">Realtime</Badge>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {chatsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
              </div>
            ) : filteredChats.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Không có hội thoại phù hợp.
              </p>
            ) : (
              <div className="p-2">
                {filteredChats.map((chat) => {
                  const isActive = selectedChatId === chat.id;
                  const parsedLast = parseMessagePayload(chat.lastMessageContent ?? '');
                  const lastSenderType = lastMessageSenderByChatId[chat.id];
                  const senderLabel =
                    lastSenderType === 'EMPLOYEE' ? 'VNMIXX' : shortDisplayName(chat.customerName);
                  const snippet =
                    parsedLast.text ||
                    (parsedLast.imageUrls.length > 0
                      ? `${senderLabel} đã gửi ${parsedLast.imageUrls.length} ảnh`
                      : 'Chưa có tin nhắn');
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      className={cn(
                        'mb-1 flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition',
                        isActive ? 'bg-muted' : 'hover:bg-muted/60',
                      )}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <Avatar className="size-9">
                        <AvatarFallback>{senderInitial(chat.customerName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{chat.customerName}</p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {chat.lastMessageAt ? formatMessageTime(chat.lastMessageAt) : '--:--'}
                          </span>
                        </div>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{snippet}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex min-h-0 flex-col rounded-xl border bg-card">
          {!selectedChatId || !selectedChatSummary ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageCircleIcon className="size-10" />
              <p>Chọn một hội thoại để bắt đầu hỗ trợ khách hàng.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback>
                      {senderInitial(selectedChatSummary.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold sm:text-base">
                      {selectedChatSummary.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedChatIsAssigned
                        ? 'Đã nhận chat'
                        : 'Bạn cần nhận chat để gửi phản hồi'}
                    </p>
                  </div>
                </div>
                {!selectedChatIsAssigned ? (
                  <Button
                    size="sm"
                    disabled={!canAssign || assignMutation.isPending}
                    onClick={() => selectedChatId && assignMutation.mutate(selectedChatId)}
                  >
                    {assignMutation.isPending ? (
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                    ) : (
                      <UserRoundCheckIcon className="mr-2 size-4" />
                    )}
                    Nhận chat
                  </Button>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-hidden border-y">
                <ScrollArea className="h-full">
                  {messagesQuery.isLoading || detailQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2Icon className="size-4 animate-spin" />
                    </div>
                  ) : timelineMessages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Cuộc hội thoại chưa có tin nhắn.
                    </p>
                  ) : (
                    <div className="flex min-h-full flex-col justify-end space-y-2 px-4 pe-2">
                      {messagesQuery.hasNextPage ? (
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void messagesQuery.fetchNextPage()}
                            disabled={messagesQuery.isFetchingNextPage}
                          >
                            {messagesQuery.isFetchingNextPage ? (
                              <Loader2Icon className="mr-2 size-4 animate-spin" />
                            ) : null}
                            Tải tin nhắn cũ hơn
                          </Button>
                        </div>
                      ) : null}
                      {timelineMessages.map(
                        ({ message, parsed, showBoundaryTimestamp, boundaryLabel }, index) => {
                          const mine = message.senderEmployeeId === employeeId;
                          const previous = index > 0 ? timelineMessages[index - 1]?.message : null;
                          const next =
                            index < timelineMessages.length - 1
                              ? timelineMessages[index + 1]?.message
                              : null;
                          const sameSenderAsPrevious =
                            previous &&
                            (previous.senderEmployeeId ?? previous.senderCustomerId) ===
                              (message.senderEmployeeId ?? message.senderCustomerId);
                          const sameSenderAsNext =
                            next &&
                            (next.senderEmployeeId ?? next.senderCustomerId) ===
                              (message.senderEmployeeId ?? message.senderCustomerId);

                          const bubbleClassName = mine
                            ? cn(
                                'bg-primary text-primary-foreground',
                                sameSenderAsPrevious ? 'rounded-tr-md' : 'rounded-tr-2xl',
                                sameSenderAsNext ? 'rounded-br-md' : 'rounded-br-2xl',
                                'rounded-tl-2xl rounded-bl-2xl',
                              )
                            : cn(
                                'bg-muted text-foreground',
                                sameSenderAsPrevious ? 'rounded-tl-md' : 'rounded-tl-2xl',
                                sameSenderAsNext ? 'rounded-bl-md' : 'rounded-bl-2xl',
                                'rounded-tr-2xl rounded-br-2xl',
                              );

                          const showIncomingAvatar = !mine && !sameSenderAsNext;
                          const isImageOnlyMessage = parsed.imageUrls.length > 0 && !parsed.text;
                          return (
                            <div key={message.id} className="space-y-2">
                              {showBoundaryTimestamp && boundaryLabel ? (
                                <div className="text-center text-xs text-muted-foreground">
                                  {boundaryLabel}
                                </div>
                              ) : null}
                              <div
                                className={cn(
                                  'flex items-end gap-2',
                                  mine ? 'justify-end' : 'justify-start',
                                )}
                              >
                                {!mine ? (
                                  showIncomingAvatar ? (
                                    <Avatar className="size-7">
                                      <AvatarFallback className="text-[10px]">
                                        {senderInitial(selectedChatSummary.customerName)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <div className="size-7 shrink-0" />
                                  )
                                ) : null}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        'max-w-[78%] text-sm',
                                        isImageOnlyMessage ? 'px-0 py-0' : 'px-3 py-2',
                                        !isImageOnlyMessage && bubbleClassName,
                                      )}
                                    >
                                      {parsed.imageUrls.length > 0 ? (
                                        <div
                                          className={cn(
                                            'grid max-w-[460px] gap-2',
                                            parsed.imageUrls.length === 1
                                              ? 'grid-cols-1'
                                              : parsed.imageUrls.length <= 4
                                                ? 'grid-cols-2'
                                                : 'grid-cols-3',
                                            !isImageOnlyMessage && 'mb-2',
                                          )}
                                        >
                                          {parsed.imageUrls.map((url) => (
                                            <button
                                              key={url}
                                              type="button"
                                              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                              onClick={() => setPreviewImageUrl(url)}
                                            >
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img
                                                src={url}
                                                alt="Ảnh đính kèm"
                                                className={cn(
                                                  'w-full rounded-md border object-cover',
                                                  parsed.imageUrls.length === 1
                                                    ? 'h-64 max-w-[420px]'
                                                    : parsed.imageUrls.length <= 4
                                                      ? 'h-40'
                                                      : 'h-28',
                                                )}
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      ) : null}
                                      {parsed.text ? (
                                        <p className="wrap-break-word">{parsed.text}</p>
                                      ) : null}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side={mine ? 'left' : 'right'}>
                                    <p>{formatFullTooltipTime(message.createdAt)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          );
                        },
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </div>

              <form
                className="flex items-center gap-2 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSendMessage();
                }}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []).filter((file) =>
                      file.type.startsWith('image/'),
                    );
                    if (files.length === 0) return;
                    const remainingSlots = Math.max(0, 10 - selectedImages.length);
                    if (remainingSlots === 0) {
                      toast.warning('Chỉ có thể gửi tối đa 10 ảnh trong một lần.');
                      event.currentTarget.value = '';
                      return;
                    }
                    if (files.length > remainingSlots) {
                      toast.warning('Chỉ có thể gửi tối đa 10 ảnh trong một lần.');
                    }
                    const acceptedFiles = files.slice(0, remainingSlots);
                    setSelectedImages((prev) => [...prev, ...acceptedFiles]);
                    event.currentTarget.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={!selectedChatIsAssigned}
                >
                  <ImageIcon className="size-4" />
                </Button>
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    selectedChatIsAssigned
                      ? 'Nhập nội dung phản hồi khách hàng...'
                      : 'Nhận chat để bắt đầu gửi tin nhắn...'
                  }
                  disabled={!selectedChatIsAssigned}
                />
                <Button
                  type="submit"
                  disabled={
                    !selectedChatIsAssigned || (!draft.trim() && selectedImages.length === 0)
                  }
                >
                  <SendHorizonalIcon className="mr-2 size-4" />
                  Gửi
                </Button>
              </form>
              {selectedImages.length > 0 ? (
                <div className="px-4 pb-4">
                  <div
                    className={cn(
                      'flex flex-wrap gap-2',
                      selectedImages.length === 1 ? 'max-w-[180px]' : 'max-w-full',
                    )}
                  >
                    {selectedImagePreviews.map(({ file, previewUrl }, index) => {
                      return (
                        <div
                          key={`${file.name}-${index}`}
                          className={cn(
                            'relative overflow-hidden rounded-md border',
                            selectedImages.length === 1 ? 'w-[180px]' : 'w-[84px] sm:w-[92px]',
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewUrl}
                            alt={file.name}
                            className="aspect-square w-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/75"
                            onClick={() =>
                              setSelectedImages((prev) =>
                                prev.filter((_, itemIndex) => itemIndex !== index),
                              )
                            }
                          >
                            <XIcon className="size-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
      <Dialog
        open={previewImageUrl !== null}
        onOpenChange={(open) => !open && setPreviewImageUrl(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">Xem trước ảnh đính kèm</DialogTitle>
          {previewImageUrl ? (
            <div
              className="flex h-full w-full items-center justify-center overflow-hidden p-2"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setPreviewImageUrl(null);
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImageUrl}
                alt="Xem trước ảnh"
                className="h-auto max-h-[96vh] w-auto max-w-[98vw] object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </ListPage>
  );
}
