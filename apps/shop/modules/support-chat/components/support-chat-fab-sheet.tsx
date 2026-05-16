'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { uploadMyMediaFiles } from '@/modules/media/api/media';
import {
  findOrCreateGuestSupportChat,
  findOrCreateSupportChat,
  listGuestSupportChatMessages,
  listSupportChatMessages,
} from '@/modules/support-chat/api/support-chat';
import { SupportChatImagePreviewDialog } from '@/modules/support-chat/components/support-chat-image-preview-dialog';
import { useSupportChatRealtime } from '@/modules/support-chat/hooks/use-support-chat-realtime';
import { useSupportChatDrawerStore } from '@/modules/support-chat/stores/support-chat-drawer-store';
import type { ChatMessage, ChatTypingEvent } from '@/modules/support-chat/types/support-chat';
import {
  buildShopSupportChatMessageContent,
  parseShopSupportMessageContent,
} from '@/modules/support-chat/utils/support-chat-parse';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/ui/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@repo/ui/components/ui/drawer';
import { toast } from '@repo/ui/components/ui/sonner';
import { TooltipProvider } from '@repo/ui/components/ui/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlusIcon, XIcon } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const INLINE_FIELD_CLASS =
  'box-border min-h-10 max-h-10 w-full shrink rounded-[4px] border border-[#E7E8E9] bg-white px-3 py-0 md:min-h-12 md:max-h-12 md:px-[15px] ' +
  'text-[14px] leading-[40px] text-[#57585A] shadow-none placeholder:text-muted-foreground/70 md:leading-[48px] ' +
  'focus-visible:border-[#E7E8E9] focus-visible:ring-0 focus-visible:outline-none disabled:bg-input/50 disabled:opacity-50';

const TIMESTAMP_BOUNDARY_MS = 5 * 60 * 1000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_CHAT_IMAGES = 10;
const MAX_DRAFT_LENGTH = 2000;
const supportChatDraftSchema = z.object({
  draft: z.string().max(MAX_DRAFT_LENGTH, { message: 'Tin nhắn quá dài.' }),
});

type SupportChatDraftValues = z.infer<typeof supportChatDraftSchema>;

function buildTypingSenderKey(event: ChatTypingEvent): string {
  if (event.senderType === 'EMPLOYEE') return `EMPLOYEE:${event.senderEmployeeId ?? 'unknown'}`;
  if (event.senderType === 'CUSTOMER') return `CUSTOMER:${event.senderCustomerId ?? 'unknown'}`;
  return 'GUEST';
}

function isSameDate(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatBoundaryTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const hhMm = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  if (isSameDate(date, now)) return hhMm;
  if (isSameDate(date, yesterday)) return `Hôm qua ${hhMm}`;
  const day = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
  return `${hhMm} ${day}`;
}

function formatFullTooltipTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const hhMm = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  if (isSameDate(date, now)) return hhMm;
  if (isSameDate(date, yesterday)) return `Hôm qua ${hhMm}`;
  const day = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
  return `${hhMm} ${day}`;
}

type SupportMessageBodyProps = {
  content: string;
  onPreviewImage: (url: string) => void;
};

const CHAT_MARKDOWN_CLASSNAME =
  'wrap-break-word leading-relaxed [&_p]:my-0 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_pre]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/10 [&_pre]:p-2 [&_code]:font-mono [&_code]:text-[13px]';

function normalizeMessageTextForMarkdown(rawText: string): string {
  return rawText.replace(/\r\n?/g, '\n').replace(/\\n/g, '\n');
}

type AiThinkingEvent = {
  chatId: number;
  isThinking: boolean;
};

type TimelineMessageItem = {
  message: ChatMessage;
  parsed: ReturnType<typeof parseShopSupportMessageContent>;
  showBoundaryTimestamp: boolean;
  boundaryLabel: string | null;
};

function SupportMessageBody({
  content,
  onPreviewImage,
}: SupportMessageBodyProps): React.JSX.Element {
  const { text, imageUrls } = parseShopSupportMessageContent(content);
  const markdownText = text ? normalizeMessageTextForMarkdown(text) : '';
  const imageCount = imageUrls.length;
  const isImageOnlyMessage = imageCount > 0 && !text;
  const imageGridClassName = cn(
    'grid w-full max-w-[min(72vw,440px)] gap-2',
    imageCount === 1 ? 'grid-cols-1' : imageCount <= 4 ? 'grid-cols-2' : 'grid-cols-3',
  );
  const imageItemClassName = cn(
    'w-full overflow-hidden border border-border/60',
    imageCount === 1 ? 'max-w-[min(72vw,360px)]' : undefined,
  );
  const imageElementClassName = cn(
    'block w-full object-cover',
    imageCount === 1 ? 'h-auto max-h-[360px]' : imageCount <= 4 ? 'aspect-square' : 'aspect-square',
  );
  return (
    <div className="space-y-2 wrap-break-word">
      {imageCount > 0 ? (
        <div className={cn(imageGridClassName, !isImageOnlyMessage && 'mb-2')}>
          {imageUrls.map((url) => (
            <div key={url} className={imageItemClassName}>
              <button
                type="button"
                className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onPreviewImage(url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Ảnh đính kèm" className={imageElementClassName} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {text ? (
        <div className={cn(CHAT_MARKDOWN_CLASSNAME, 'select-text')}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{markdownText}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}

type SupportChatTimelineProps = {
  timelineMessages: readonly TimelineMessageItem[];
  typingEvent: ChatTypingEvent | null;
  aiThinking: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onPreviewImage: (url: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
};

const SupportChatTimeline = memo(function SupportChatTimeline({
  timelineMessages,
  typingEvent,
  aiThinking,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onPreviewImage,
  messagesEndRef,
}: SupportChatTimelineProps): React.JSX.Element {
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/25 p-4">
      {hasNextPage ? (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={isFetchingNextPage}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
            onClick={onLoadMore}
          >
            {isFetchingNextPage ? 'Đang tải...' : 'Tải thêm tin nhắn'}
          </button>
        </div>
      ) : null}
      {timelineMessages.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Chưa có tin nhắn. Hãy gửi câu hỏi cho chúng tôi.
        </p>
      ) : null}
      {timelineMessages.map(({ message, parsed, showBoundaryTimestamp, boundaryLabel }) => {
        const mine = message.senderType === 'CUSTOMER' || message.senderType === 'GUEST';
        const isImageOnlyMessage = parsed.imageUrls.length > 0 && !parsed.text;
        const bubbleClassName = mine
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground';

        const bubbleRadiusClassName = isImageOnlyMessage
          ? 'rounded-2xl overflow-hidden'
          : cn(
              'rounded-2xl',
              mine ? 'rounded-tr-[4px] rounded-br-[4px]' : 'rounded-tl-[4px] rounded-bl-[4px]',
            );

        return (
          <div key={message.id} className="space-y-2">
            {showBoundaryTimestamp && boundaryLabel ? (
              <div className="text-center text-xs text-muted-foreground">{boundaryLabel}</div>
            ) : null}
            <div className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
              <div
                title={formatFullTooltipTime(message.createdAt)}
                className={cn(
                  'max-w-[78%] text-sm select-text',
                  isImageOnlyMessage ? 'px-0 py-0' : 'px-3 py-2',
                  !isImageOnlyMessage && bubbleClassName,
                  bubbleRadiusClassName,
                )}
              >
                <SupportMessageBody content={message.content} onPreviewImage={onPreviewImage} />
              </div>
            </div>
          </div>
        );
      })}
      {typingEvent ? (
        <div className="flex items-end gap-2 justify-start">
          <div className="rounded-2xl rounded-tl-[4px] rounded-bl-[4px] bg-muted px-3 py-2 text-sm leading-none text-muted-foreground">
            <span className="sr-only">Đang nhập</span>
            <span className="inline-flex items-center gap-1" aria-hidden>
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0.2s]" />
            </span>
          </div>
        </div>
      ) : null}
      {aiThinking ? (
        <div className="flex items-end gap-2 justify-start">
          <div className="rounded-2xl rounded-tl-[4px] rounded-bl-[4px] bg-muted px-3 py-2 text-sm leading-none text-muted-foreground">
            <span className="sr-only">Đang phản hồi</span>
            <span className="inline-flex items-center gap-1" aria-hidden>
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0.2s]" />
            </span>
          </div>
        </div>
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );
});

export function SupportChatFabSheet(): React.JSX.Element {
  const queryClient = useQueryClient();
  const isAuthSessionReady = useAuthSessionReady();
  const isOpen = useSupportChatDrawerStore((state) => state.isOpen);
  const setDrawerOpen = useSupportChatDrawerStore((state) => state.setOpen);
  const closeDrawer = useSupportChatDrawerStore((state) => state.closeDrawer);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = Boolean(accessToken && user);
  const chatMode = isLoggedIn ? 'authenticated' : 'guest';
  const form = useForm<SupportChatDraftValues>({
    resolver: zodResolver(supportChatDraftSchema),
    defaultValues: { draft: '' },
  });
  const { register, handleSubmit, watch, setValue } = form;
  const draft = watch('draft');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [scrollToBottomTick, setScrollToBottomTick] = useState(0);
  const [typingEvent, setTypingEvent] = useState<ChatTypingEvent | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const optimisticIdRef = useRef(-1);
  const optimisticImageUrlsRef = useRef(new Map<number, string[]>());
  const typingClearTimerRef = useRef<number | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const chatQueryFn = isLoggedIn ? findOrCreateSupportChat : findOrCreateGuestSupportChat;
  const chatQuery = useQuery({
    queryKey: ['support-chat', 'detail', chatMode],
    queryFn: chatQueryFn,
    enabled: isOpen && isAuthSessionReady,
    staleTime: Infinity,
  });
  const chatId = chatQuery.data?.id ?? null;
  const messagesListFn = isLoggedIn ? listSupportChatMessages : listGuestSupportChatMessages;
  const messagesQuery = useInfiniteQuery({
    queryKey: ['support-chat', 'messages', chatMode, chatId ?? 'none'],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) =>
      messagesListFn(chatId!, {
        limit: 30,
        ...(pageParam !== null ? { cursor: pageParam } : {}),
      }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : null),
    enabled: isOpen && chatId !== null,
  });
  const selectedImagePreviews = useMemo(
    () => selectedImages.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    [selectedImages],
  );

  const onNewMessage = useCallback(
    (payload: unknown): void => {
      const message = payload as ChatMessage;
      if (!chatId || message.chatId !== chatId) return;
      setTypingEvent(null);
      if (typingClearTimerRef.current !== null) {
        window.clearTimeout(typingClearTimerRef.current);
        typingClearTimerRef.current = null;
      }
      setOptimisticMessages((previous) => {
        const incomingParsed = parseShopSupportMessageContent(message.content);
        const isMySentMessage = isLoggedIn
          ? message.senderType === 'CUSTOMER' && message.senderCustomerId === user?.id
          : message.senderType === 'GUEST';
        const targetIndex = isMySentMessage
          ? previous.findIndex((item) => {
              if (item.chatId !== message.chatId) return false;
              const optimisticParsed = parseShopSupportMessageContent(item.content);
              if (incomingParsed.imageUrls.length > 0) {
                return item.id < 0 && optimisticParsed.imageUrls.length > 0;
              }
              return optimisticParsed.text === incomingParsed.text;
            })
          : -1;
        if (targetIndex === -1) return previous;
        const target = previous[targetIndex];
        if (target && target.id < 0) {
          const urls = optimisticImageUrlsRef.current.get(target.id);
          if (urls) {
            urls.forEach((url) => URL.revokeObjectURL(url));
            optimisticImageUrlsRef.current.delete(target.id);
          }
        }
        return previous.filter((_, index) => index !== targetIndex);
      });
      setRealtimeMessages((previous) => {
        if (previous.some((item) => item.id === message.id)) return previous;
        return [...previous, message];
      });
      if (message.senderType === 'AI') {
        setAiThinking(false);
      }
      setScrollToBottomTick((tick) => tick + 1);
    },
    [chatId, isLoggedIn, user?.id],
  );

  const onChatAssigned = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: ['support-chat', 'detail', chatMode] });
  }, [chatMode, queryClient]);

  const onTypingChange = useCallback(
    (payload: unknown): void => {
      const event = payload as ChatTypingEvent;
      if (!chatId || event.chatId !== chatId || typeof event.isTyping !== 'boolean') return;
      const isOwnEvent = isLoggedIn
        ? event.senderType === 'CUSTOMER' && event.senderCustomerId === user?.id
        : event.senderType === 'GUEST';
      if (isOwnEvent) return;
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
    [chatId, isLoggedIn, user?.id],
  );

  const onAiThinkingChange = useCallback(
    (payload: unknown): void => {
      const event = payload as AiThinkingEvent;
      if (!chatId || event.chatId !== chatId || typeof event.isThinking !== 'boolean') return;
      setAiThinking(event.isThinking);
    },
    [chatId],
  );

  const socket = useSupportChatRealtime({
    chatId,
    mode: chatMode,
    enabled: isOpen && chatId !== null,
    onNewMessage,
    onChatAssigned,
    onTypingChange,
    onAiThinkingChange,
  });

  const handleStopAiResponse = useCallback((): void => {
    if (!socket || !chatId) return;
    socket.emit('stopAiResponse', { chatId });
    setAiThinking(false);
  }, [chatId, socket]);

  const emitTyping = useCallback(
    (isTyping: boolean): void => {
      if (!socket || !chatId) return;
      socket.emit('typing', { chatId, isTyping });
    },
    [chatId, socket],
  );

  const stopTypingSignal = useCallback((): void => {
    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    emitTyping(false);
  }, [emitTyping]);

  const handleDraftTypingChange = useCallback(
    (value: string): void => {
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
    [emitTyping, stopTypingSignal],
  );

  const draftField = register('draft', {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      handleDraftTypingChange(event.target.value);
    },
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

  const timelineMessages = useMemo(
    () =>
      messages.map((message, index) => {
        const previous = index > 0 ? messages[index - 1] : undefined;
        const showBoundaryTimestamp =
          !previous ||
          new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() >=
            TIMESTAMP_BOUNDARY_MS;
        return {
          message,
          parsed: parseShopSupportMessageContent(message.content),
          showBoundaryTimestamp,
          boundaryLabel: showBoundaryTimestamp ? formatBoundaryTimestamp(message.createdAt) : null,
        };
      }),
    [messages],
  );

  const pushOptimisticMessage = useCallback(
    (content: string): number | null => {
      if (!chatId) return null;
      if (isLoggedIn && !user?.id) return null;
      const tempId = optimisticIdRef.current;
      optimisticIdRef.current -= 1;
      setOptimisticMessages((previous) => [
        ...previous,
        {
          id: tempId,
          chatId,
          senderType: isLoggedIn ? 'CUSTOMER' : 'GUEST',
          senderCustomerId: isLoggedIn ? user!.id : null,
          senderEmployeeId: null,
          senderName: isLoggedIn ? (user!.fullName ?? null) : 'Khách',
          senderAvatarUrl: isLoggedIn ? (user!.avatarUrl ?? null) : null,
          content,
          createdAt: new Date().toISOString(),
        },
      ]);
      return tempId;
    },
    [chatId, isLoggedIn, user],
  );

  const handleSendMessage = async (values: SupportChatDraftValues): Promise<void> => {
    if (!socket || !chatId) return;
    if (aiThinking) {
      toast.warning('AI đang trả lời. Nhấn Dừng để hủy và gửi tin mới.', {
        position: 'bottom-right',
      });
      return;
    }
    const textContent = values.draft.trim();
    const imagesToSend = selectedImages;
    if (!textContent && imagesToSend.length === 0) return;
    stopTypingSignal();
    setValue('draft', '', { shouldValidate: true });
    setSelectedImages([]);
    setScrollToBottomTick((tick) => tick + 1);
    if (textContent) {
      pushOptimisticMessage(textContent);
      socket.emit('sendMessage', { chatId, content: textContent });
    }
    if (isLoggedIn && imagesToSend.length > 0) {
      const localImageUrls = selectedImagePreviews.map((item) => item.previewUrl);
      const optimisticImageContent = buildShopSupportChatMessageContent('', localImageUrls);
      const optimisticImageId = pushOptimisticMessage(optimisticImageContent);
      if (optimisticImageId !== null) {
        optimisticImageUrlsRef.current.set(optimisticImageId, localImageUrls);
      }
      setScrollToBottomTick((tick) => tick + 1);
      void uploadMyMediaFiles(imagesToSend)
        .then((uploaded) => {
          const uploadedUrls = uploaded.map((file) => file.url);
          const imageContent = buildShopSupportChatMessageContent('', uploadedUrls);
          socket.emit('sendMessage', { chatId, content: imageContent });
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
          toast.error(error instanceof Error ? error.message : 'Không gửi được ảnh.', {
            position: 'bottom-right',
          });
        });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages.length, scrollToBottomTick, typingEvent, aiThinking]);

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

  useEffect(() => {
    if (!chatId) {
      setAiThinking(false);
    }
  }, [chatId]);

  useEffect(() => {
    if (!isOpen) {
      setAiThinking(false);
    }
  }, [isOpen]);

  function handlePickImages(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    );
    if (files.length === 0) return;
    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      toast.error('Mỗi ảnh không được vượt quá 10MB.', { position: 'bottom-right' });
      event.currentTarget.value = '';
      return;
    }
    const remainingSlots = Math.max(0, MAX_CHAT_IMAGES - selectedImages.length);
    if (remainingSlots === 0) {
      toast.warning(`Chỉ có thể gửi tối đa ${MAX_CHAT_IMAGES} ảnh trong một lần.`, {
        position: 'bottom-right',
      });
      event.currentTarget.value = '';
      return;
    }
    if (files.length > remainingSlots) {
      toast.warning(`Chỉ có thể gửi tối đa ${MAX_CHAT_IMAGES} ảnh trong một lần.`, {
        position: 'bottom-right',
      });
    }
    const accepted = files.slice(0, remainingSlots);
    setSelectedImages((prev) => [...prev, ...accepted]);
    event.currentTarget.value = '';
  }

  return (
    <TooltipProvider>
      <Drawer direction="right" open={isOpen} onOpenChange={setDrawerOpen} handleOnly>
        <DrawerContent className="h-svh rounded-none border-l bg-background p-0 data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-none sm:data-[vaul-drawer-direction=right]:max-w-none md:data-[vaul-drawer-direction=right]:max-w-[420px]">
          <div className="flex h-full min-h-0 flex-col">
            <DrawerHeader className="border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <DrawerTitle className="text-[20px] font-semibold leading-none">
                  Hỗ trợ trực tuyến
                </DrawerTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-9 rounded-full"
                  aria-label="Đóng hỗ trợ trực tuyến"
                  onClick={closeDrawer}
                >
                  <XIcon className="size-6" />
                </Button>
              </div>
            </DrawerHeader>
            {!isAuthSessionReady ? (
              <div className="flex-1 p-4 text-sm text-muted-foreground">Đang tải...</div>
            ) : chatQuery.isLoading || messagesQuery.isLoading ? (
              <div className="flex-1 p-4 text-sm text-muted-foreground">
                Đang tải cuộc hội thoại...
              </div>
            ) : chatQuery.isError || !chatQuery.data || messagesQuery.isError ? (
              <div className="flex-1 p-4 text-sm text-destructive">Không tải được tin nhắn.</div>
            ) : (
              <>
                <SupportChatTimeline
                  timelineMessages={timelineMessages}
                  typingEvent={typingEvent}
                  aiThinking={aiThinking}
                  hasNextPage={messagesQuery.hasNextPage}
                  isFetchingNextPage={messagesQuery.isFetchingNextPage}
                  onLoadMore={() => void messagesQuery.fetchNextPage()}
                  onPreviewImage={setPreviewImageUrl}
                  messagesEndRef={messagesEndRef}
                />
                <form
                  className="shrink-0 border-t border-border bg-card p-4"
                  onSubmit={handleSubmit((values: SupportChatDraftValues) => {
                    void handleSendMessage(values);
                  })}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handlePickImages}
                  />
                  {selectedImagePreviews.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {selectedImagePreviews.map((entry, index) => (
                        <div
                          key={`${entry.file.name}-${entry.previewUrl}`}
                          className="relative size-14 overflow-hidden border border-border bg-muted"
                        >
                          <Image
                            src={entry.previewUrl}
                            alt=""
                            fill
                            sizes="56px"
                            unoptimized
                            className="object-cover"
                          />
                          <button
                            type="button"
                            className="bg-background/90 text-foreground absolute top-0.5 right-0.5 rounded p-0.5"
                            aria-label="Bỏ ảnh"
                            onClick={() =>
                              setSelectedImages((prev) => prev.filter((_, idx) => idx !== index))
                            }
                          >
                            <XIcon className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-row items-stretch gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 shrink-0 rounded-[4px] border-[#E7E8E9] md:size-12"
                      aria-label="Đính kèm ảnh"
                      disabled={
                        !socket ||
                        !isLoggedIn ||
                        aiThinking ||
                        selectedImages.length >= MAX_CHAT_IMAGES
                      }
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlusIcon className="size-5 text-[#57585A]" />
                    </Button>
                    <input
                      type="text"
                      maxLength={MAX_DRAFT_LENGTH}
                      {...draftField}
                      placeholder="Nhập tin nhắn..."
                      className={INLINE_FIELD_CLASS}
                      disabled={!socket}
                    />
                    <PrimaryCtaButton
                      type={aiThinking ? 'button' : 'submit'}
                      className="h-10! min-h-10! w-auto! shrink-0 px-5! md:h-12! md:min-h-12!"
                      disabled={
                        !socket ||
                        (!aiThinking && draft.trim() === '' && selectedImages.length === 0)
                      }
                      onClick={aiThinking ? handleStopAiResponse : undefined}
                    >
                      {aiThinking ? 'Dừng' : 'Gửi'}
                    </PrimaryCtaButton>
                  </div>
                </form>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
      <SupportChatImagePreviewDialog
        previewImageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </TooltipProvider>
  );
}
