'use client';

import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { ListPage } from '@/modules/common/components/list-page';
import { uploadMedia } from '@/modules/media/api/media';
import {
  assignSelfToChat,
  getAdminChatDetail,
  listAdminChatMessages,
  listAdminChats,
  updateAdminChatAiMode,
} from '@/modules/support-chat/api/support-chat';
import { SupportChatImagePreviewDialog } from '@/modules/support-chat/components/support-chat/support-chat-image-preview-dialog';
import { SupportChatListSidebar } from '@/modules/support-chat/components/support-chat/support-chat-list-sidebar';
import { useSupportChatRealtime } from '@/modules/support-chat/hooks/use-support-chat-realtime';
import type {
  ChatMessage,
  ChatSenderType,
  ChatSummary,
  ChatTypingEvent,
  SupportChatAiMode,
} from '@/modules/support-chat/types/support-chat';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { ScrollArea } from '@repo/ui/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ImageIcon,
  Loader2Icon,
  MessageCircleIcon,
  SendHorizonalIcon,
  UserRoundCheckIcon,
  XIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import {
  SUPPORT_CHATS_LIST_QUERY,
  TIMESTAMP_BOUNDARY_MS,
  apiErrorMessage,
  buildMessagePayload,
  formatBoundaryTimestamp,
  formatFullTooltipTime,
  parseMessagePayload,
  patchSupportChatListCache,
  senderInitial,
  type SupportChatsListCache,
} from './support-chat.utils';

const CHAT_MARKDOWN_CLASSNAME =
  'wrap-break-word leading-relaxed [&_p]:my-0 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_pre]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/10 [&_pre]:p-2 [&_code]:font-mono [&_code]:text-[13px]';

function normalizeMessageTextForMarkdown(rawText: string): string {
  return rawText.replace(/\r\n?/g, '\n').replace(/\\n/g, '\n');
}

function buildTypingSenderKey(event: ChatTypingEvent): string {
  if (event.senderType === 'EMPLOYEE') return `EMPLOYEE:${event.senderEmployeeId ?? 'unknown'}`;
  if (event.senderType === 'CUSTOMER') return `CUSTOMER:${event.senderCustomerId ?? 'unknown'}`;
  if (event.senderType === 'AI') return 'AI';
  return 'GUEST';
}

function buildMessageSenderKey(message: ChatMessage): string {
  if (message.senderType === 'EMPLOYEE') return `EMPLOYEE:${message.senderEmployeeId ?? 'unknown'}`;
  if (message.senderType === 'CUSTOMER') return `CUSTOMER:${message.senderCustomerId ?? 'unknown'}`;
  if (message.senderType === 'AI') return 'AI';
  return 'GUEST';
}

function resolveMessageSenderName(message: ChatMessage, fallbackCustomerName: string): string {
  if (message.senderType === 'CUSTOMER') return message.senderName?.trim() || fallbackCustomerName;
  if (message.senderType === 'EMPLOYEE') return message.senderName?.trim() || 'Nhân viên';
  if (message.senderType === 'AI') return message.senderName?.trim() || 'VNMIXX AI';
  return message.senderName?.trim() || 'Khách';
}

export function SupportChatManagementView(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [keyword, setKeyword] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [lastMessageSenderByChatId, setLastMessageSenderByChatId] = useState<
    Record<number, ChatSenderType>
  >({});
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [scrollToBottomTick, setScrollToBottomTick] = useState(0);
  const [joinNonce, setJoinNonce] = useState(0);
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [typingEvent, setTypingEvent] = useState<ChatTypingEvent | null>(null);
  const optimisticIdRef = useRef(-1);
  const optimisticImageUrlsRef = useRef(new Map<number, string[]>());
  const typingClearTimerRef = useRef<number | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const previousSelectedChatIdRef = useRef<number | null>(null);

  const canRead = user?.permissions.includes('support-chat.read') ?? false;
  const canAssign = user?.permissions.includes('support-chat.create') ?? false;
  const employeeId = user?.userType === 'EMPLOYEE' ? user.id : null;
  const pathnameSegments = useMemo(() => (pathname ?? '').split('/').filter(Boolean), [pathname]);

  /** `/support-chats/:customerId` numeric segment after list root. */
  const routeCustomerId = useMemo((): number | null => {
    if (pathnameSegments[0] !== 'support-chats' || pathnameSegments.length !== 2) return null;
    const raw = pathnameSegments[1];
    if (!raw || pathnameSegments[1] === 'guest') return null;
    if (!/^\d+$/.test(raw)) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [pathnameSegments]);

  /** `/support-chats/guest/:chatId` */
  const routeGuestChatId = useMemo((): number | null => {
    if (
      pathnameSegments[0] !== 'support-chats' ||
      pathnameSegments[1] !== 'guest' ||
      pathnameSegments.length !== 3
    )
      return null;
    const raw = pathnameSegments[2];
    if (!raw || !/^\d+$/.test(raw)) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [pathnameSegments]);
  const normalizedKeyword = useMemo(() => keyword.trim(), [keyword]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedKeyword(normalizedKeyword);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedKeyword]);

  const chatsListQueryKey = useMemo(
    () =>
      [
        ...SUPPORT_CHATS_LIST_QUERY,
        {
          page: 1,
          pageSize: 50,
          assignedToMe: assignedToMe || undefined,
          search: debouncedKeyword || undefined,
        },
      ] as const,
    [assignedToMe, debouncedKeyword],
  );

  const chatsQuery = useQuery({
    queryKey: chatsListQueryKey,
    queryFn: () =>
      listAdminChats({
        page: 1,
        pageSize: 50,
        assignedToMe: assignedToMe || undefined,
        search: debouncedKeyword || undefined,
      }),
    enabled: canRead,
    staleTime: 10_000,
  });

  const selectedChatSummary = useMemo<ChatSummary | null>(() => {
    if (!selectedChatId) return null;
    return chatsQuery.data?.items.find((item) => item.id === selectedChatId) ?? null;
  }, [chatsQuery.data?.items, selectedChatId]);

  const filteredChats = useMemo(() => chatsQuery.data?.items ?? [], [chatsQuery.data?.items]);

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
  const selectedChatAiMode = detailQuery.data?.aiMode ?? null;
  const selectedChatAiEnabled = selectedChatAiMode === 'AUTO';

  const refreshChatData = useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SUPPORT_CHATS_LIST_QUERY }),
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
  const updateAiModeMutation = useMutation({
    mutationFn: ({ chatId, aiMode }: { chatId: number; aiMode: SupportChatAiMode }) =>
      updateAdminChatAiMode(chatId, aiMode),
    onSuccess: async (chat) => {
      queryClient.setQueryData(['admin', 'support-chats', 'detail', chat.id], chat);
      toast.success(
        chat.aiMode === 'AUTO' ? 'Đã bật AI cho cuộc hội thoại.' : 'Đã tắt AI cho cuộc hội thoại.',
      );
      await refreshChatData();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });
  const uploadImagesMutation = useMutation({
    mutationFn: (files: File[]) =>
      uploadMedia(files, {
        customerId: selectedChatSummary?.customerId ?? undefined,
      }),
  });

  const onNewMessage = useCallback(
    (payload: unknown): void => {
      const message = payload as ChatMessage;
      if (!selectedChatId || message.chatId !== selectedChatId) return;
      setTypingEvent(null);
      if (typingClearTimerRef.current !== null) {
        window.clearTimeout(typingClearTimerRef.current);
        typingClearTimerRef.current = null;
      }
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
      queryClient.setQueryData<SupportChatsListCache | undefined>(chatsListQueryKey, (previous) =>
        patchSupportChatListCache(previous, message),
      );
      setScrollToBottomTick((tick) => tick + 1);
    },
    [chatsListQueryKey, employeeId, queryClient, selectedChatId],
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

  const onTypingChange = useCallback(
    (payload: unknown): void => {
      const event = payload as ChatTypingEvent;
      if (
        !selectedChatId ||
        event.chatId !== selectedChatId ||
        typeof event.isTyping !== 'boolean'
      ) {
        return;
      }
      if (event.senderType === 'EMPLOYEE' && event.senderEmployeeId === employeeId) {
        return;
      }
      const senderKey = buildTypingSenderKey(event);
      if (typingClearTimerRef.current !== null) {
        window.clearTimeout(typingClearTimerRef.current);
        typingClearTimerRef.current = null;
      }
      if (!event.isTyping) {
        setTypingEvent((previous) =>
          previous && buildTypingSenderKey(previous) === senderKey ? null : previous,
        );
        return;
      }
      setTypingEvent(event);
      typingClearTimerRef.current = window.setTimeout(() => {
        setTypingEvent((previous) =>
          previous && buildTypingSenderKey(previous) === senderKey ? null : previous,
        );
        typingClearTimerRef.current = null;
      }, 1500);
    },
    [employeeId, selectedChatId],
  );

  const socket = useSupportChatRealtime({
    chatId: selectedChatId,
    enabled: canRead && selectedChatId !== null,
    joinNonce,
    onNewMessage,
    onChatAssigned,
    onTypingChange,
  });

  const emitTyping = useCallback(
    (isTyping: boolean): void => {
      if (!socket || !selectedChatId || !selectedChatIsAssigned) return;
      socket.emit('typing', { chatId: selectedChatId, isTyping });
    },
    [selectedChatId, selectedChatIsAssigned, socket],
  );

  const stopTypingSignal = useCallback((): void => {
    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    emitTyping(false);
  }, [emitTyping]);

  const handleDraftChange = useCallback(
    (value: string): void => {
      setDraft(value);
      if (!selectedChatIsAssigned) return;
      if (!value.trim()) {
        stopTypingSignal();
        return;
      }
      emitTyping(true);
      if (typingStopTimerRef.current !== null) {
        window.clearTimeout(typingStopTimerRef.current);
      }
      typingStopTimerRef.current = window.setTimeout(() => {
        emitTyping(false);
        typingStopTimerRef.current = null;
      }, 1200);
    },
    [emitTyping, selectedChatIsAssigned, stopTypingSignal],
  );

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

  const typingAvatarUrl = useMemo(() => {
    if (!typingEvent || !selectedChatId || typingEvent.chatId !== selectedChatId) return null;
    if (typingEvent.senderType === 'CUSTOMER') {
      return selectedChatSummary?.customerAvatarUrl ?? null;
    }
    if (typingEvent.senderType === 'AI') return null;
    if (typingEvent.senderType !== 'EMPLOYEE' || !typingEvent.senderEmployeeId) return null;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (
        message?.senderType === 'EMPLOYEE' &&
        message.senderEmployeeId === typingEvent.senderEmployeeId &&
        message.senderAvatarUrl
      ) {
        return message.senderAvatarUrl;
      }
    }
    return null;
  }, [messages, selectedChatId, selectedChatSummary?.customerAvatarUrl, typingEvent]);

  const typingSenderName = useMemo(() => {
    if (!typingEvent || !selectedChatId || typingEvent.chatId !== selectedChatId) return null;
    if (typingEvent.senderType === 'CUSTOMER') return selectedChatSummary?.customerName ?? 'Khách';
    if (typingEvent.senderType === 'GUEST') return 'Khách';
    if (typingEvent.senderType === 'AI') return 'VNMIXX AI';
    if (!typingEvent.senderEmployeeId) return 'Nhân viên';
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (
        message?.senderType === 'EMPLOYEE' &&
        message.senderEmployeeId === typingEvent.senderEmployeeId &&
        message.senderName?.trim()
      ) {
        return message.senderName.trim();
      }
    }
    return 'Nhân viên';
  }, [messages, selectedChatId, selectedChatSummary?.customerName, typingEvent]);

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
    stopTypingSignal();
    const selectedChat = chatsQuery.data?.items.find((chat) => chat.id === chatId);
    if (selectedChat) {
      const targetPath =
        selectedChat.customerId !== null
          ? `/support-chats/${selectedChat.customerId}`
          : `/support-chats/guest/${selectedChat.id}`;
      router.push(targetPath);
    }
    setSelectedChatId(chatId);
    setRealtimeMessages([]);
    setOptimisticMessages([]);
    setDraft('');
    setTypingEvent(null);
    if (typingClearTimerRef.current !== null) {
      window.clearTimeout(typingClearTimerRef.current);
      typingClearTimerRef.current = null;
    }
    setSelectedImages([]);
    setScrollToBottomTick((tick) => tick + 1);
  };

  useEffect(() => {
    if (!chatsQuery.data?.items) return;
    if (routeGuestChatId !== null) {
      const targetChat = chatsQuery.data.items.find(
        (chat) => chat.id === routeGuestChatId && chat.customerId === null,
      );
      if (!targetChat) return;
      if (selectedChatId === targetChat.id) return;
      stopTypingSignal();
      setSelectedChatId(targetChat.id);
      setRealtimeMessages([]);
      setOptimisticMessages([]);
      setDraft('');
      setTypingEvent(null);
      if (typingClearTimerRef.current !== null) {
        window.clearTimeout(typingClearTimerRef.current);
        typingClearTimerRef.current = null;
      }
      setSelectedImages([]);
      setScrollToBottomTick((tick) => tick + 1);
      return;
    }
    if (routeCustomerId === null) return;
    const targetChat = chatsQuery.data.items.find((chat) => chat.customerId === routeCustomerId);
    if (!targetChat) return;
    if (selectedChatId === targetChat.id) return;
    stopTypingSignal();
    setSelectedChatId(targetChat.id);
    setRealtimeMessages([]);
    setOptimisticMessages([]);
    setDraft('');
    setTypingEvent(null);
    if (typingClearTimerRef.current !== null) {
      window.clearTimeout(typingClearTimerRef.current);
      typingClearTimerRef.current = null;
    }
    setSelectedImages([]);
    setScrollToBottomTick((tick) => tick + 1);
  }, [chatsQuery.data?.items, routeCustomerId, routeGuestChatId, selectedChatId, stopTypingSignal]);

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
          senderAvatarUrl: user?.avatarUrl ?? null,
          content,
          createdAt: new Date().toISOString(),
        },
      ]);
      return tempId;
    },
    [employeeId, selectedChatId, user?.avatarUrl, user?.fullName],
  );

  const handleSendMessage = async (): Promise<void> => {
    if (!socket || !selectedChatId) return;
    const textContent = draft.trim();
    const imagesToSend = selectedImages;
    if (!textContent && imagesToSend.length === 0) return;
    stopTypingSignal();
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
    const isChatChanged = previousSelectedChatIdRef.current !== selectedChatId;
    messagesEndRef.current?.scrollIntoView({
      behavior: isChatChanged ? 'auto' : 'smooth',
      block: 'end',
    });
    previousSelectedChatIdRef.current = selectedChatId;
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

  useEffect(() => {
    return () => {
      if (typingClearTimerRef.current !== null) {
        window.clearTimeout(typingClearTimerRef.current);
      }
      if (typingStopTimerRef.current !== null) {
        window.clearTimeout(typingStopTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      stopTypingSignal();
    };
  }, [stopTypingSignal]);

  if (!canRead) {
    return (
      <ListPage title="Hỗ trợ trực tuyến">
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Bạn chưa có quyền `support-chat.read` để truy cập module này.
        </div>
      </ListPage>
    );
  }

  return (
    <ListPage title="Hỗ trợ trực tuyến">
      <section className="grid h-[calc(100dvh-10.5rem)] min-h-[560px] gap-4 lg:grid-cols-[320px_1fr]">
        <SupportChatListSidebar
          chats={filteredChats}
          isLoading={chatsQuery.isLoading}
          keyword={keyword}
          onKeywordChange={setKeyword}
          assignedToMe={assignedToMe}
          onAssignedToMeChange={setAssignedToMe}
          selectedChatId={selectedChatId}
          lastMessageSenderByChatId={lastMessageSenderByChatId}
          onSelectChat={handleSelectChat}
        />

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
                    {selectedChatSummary.customerAvatarUrl ? (
                      <AvatarImage src={selectedChatSummary.customerAvatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>
                      {senderInitial(selectedChatSummary.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {selectedChatSummary.customerId !== null ? (
                      <Link
                        href={`/customers/${selectedChatSummary.customerId}`}
                        className="text-sm font-semibold hover:underline sm:text-base"
                      >
                        {selectedChatSummary.customerName}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold sm:text-base">
                        {selectedChatSummary.customerName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {detailQuery.data ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canAssign || updateAiModeMutation.isPending}
                      onClick={() =>
                        selectedChatId &&
                        updateAiModeMutation.mutate({
                          chatId: selectedChatId,
                          aiMode: selectedChatAiEnabled ? 'OFF' : 'AUTO',
                        })
                      }
                    >
                      {updateAiModeMutation.isPending ? (
                        <Loader2Icon className="mr-2 size-4 animate-spin" />
                      ) : null}
                      {selectedChatAiEnabled ? 'Tắt AI' : 'Bật AI'}
                    </Button>
                  ) : null}
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
                          const nextItem =
                            index < timelineMessages.length - 1
                              ? timelineMessages[index + 1]
                              : undefined;
                          const senderKey = buildMessageSenderKey(message);
                          const sameSenderAsNext =
                            nextItem !== undefined &&
                            buildMessageSenderKey(nextItem.message) === senderKey;

                          const isImageOnlyMessage = parsed.imageUrls.length > 0 && !parsed.text;
                          const markdownText = parsed.text
                            ? normalizeMessageTextForMarkdown(parsed.text)
                            : '';
                          const senderFallbackName = resolveMessageSenderName(
                            message,
                            selectedChatSummary.customerName,
                          );
                          const bubbleClassName = mine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground';

                          const bubbleRadiusClassName = isImageOnlyMessage
                            ? 'rounded-2xl overflow-hidden'
                            : cn(
                                'rounded-2xl',
                                mine
                                  ? 'rounded-tr-[4px] rounded-br-[4px]'
                                  : 'rounded-tl-[4px] rounded-bl-[4px]',
                              );

                          const showIncomingAvatar = !mine && !sameSenderAsNext;

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
                                      {message.senderAvatarUrl ? (
                                        <AvatarImage src={message.senderAvatarUrl} alt="" />
                                      ) : null}
                                      <AvatarFallback className="text-[10px]">
                                        {message.senderType === 'AI'
                                          ? 'AI'
                                          : senderInitial(senderFallbackName)}
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
                                        bubbleRadiusClassName,
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
                                              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                              onClick={() => setPreviewImageUrl(url)}
                                            >
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img
                                                src={url}
                                                alt="Ảnh đính kèm"
                                                className={cn(
                                                  'w-full border object-cover',
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
                                        <div className={CHAT_MARKDOWN_CLASSNAME}>
                                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                            {markdownText}
                                          </ReactMarkdown>
                                        </div>
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
                      {typingEvent ? (
                        <div className="space-y-2">
                          <div className="flex items-end gap-2 justify-start">
                            <Avatar className="size-7">
                              {typingAvatarUrl ? (
                                <AvatarImage src={typingAvatarUrl} alt="" />
                              ) : null}
                              <AvatarFallback className="text-[10px]">
                                {senderInitial(typingSenderName ?? 'Khách')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="rounded-2xl rounded-tl-[4px] rounded-bl-[4px] bg-muted px-3 py-2 text-sm leading-none text-muted-foreground">
                              <span className="sr-only">Đang nhập</span>
                              <span className="inline-flex items-center gap-1" aria-hidden>
                                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                                <span className="size-1.5 animate-bounce rounded-full bg-current" />
                                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0.2s]" />
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
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
                  onChange={(event) => handleDraftChange(event.target.value)}
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
                            'relative overflow-hidden border',
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
      <SupportChatImagePreviewDialog
        previewImageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </ListPage>
  );
}
