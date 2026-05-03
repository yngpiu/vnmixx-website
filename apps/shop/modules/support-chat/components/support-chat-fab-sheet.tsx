'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { uploadMyMediaFiles } from '@/modules/media/api/media';
import {
  findOrCreateSupportChat,
  listSupportChatMessages,
} from '@/modules/support-chat/api/support-chat';
import { useSupportChatRealtime } from '@/modules/support-chat/hooks/use-support-chat-realtime';
import { useSupportChatDrawerStore } from '@/modules/support-chat/stores/support-chat-drawer-store';
import type { ChatMessage } from '@/modules/support-chat/types/support-chat';
import {
  buildShopSupportChatMessageContent,
  parseShopSupportMessageContent,
} from '@/modules/support-chat/utils/support-chat-parse';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/ui/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@repo/ui/components/ui/drawer';
import { toast } from '@repo/ui/components/ui/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlusIcon, XIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function SupportMessageBody({ content }: { content: string }): React.JSX.Element {
  const { text, imageUrls } = parseShopSupportMessageContent(content);
  const imageCount = imageUrls.length;
  const isImageOnlyMessage = imageCount > 0 && !text;
  return (
    <div className="space-y-2 wrap-break-word">
      {imageCount > 0 ? (
        <div
          className={cn(
            'grid max-w-[460px] gap-2',
            imageCount === 1 ? 'grid-cols-1' : imageCount <= 4 ? 'grid-cols-2' : 'grid-cols-3',
            !isImageOnlyMessage && 'mb-2',
          )}
        >
          {imageUrls.map((url) => (
            <div
              key={url}
              className={cn(
                'overflow-hidden rounded-md border border-border/60',
                imageCount === 1 && 'max-w-[420px]',
              )}
            >
              <div
                className={cn(
                  'relative w-full',
                  imageCount === 1 ? 'h-64' : imageCount <= 4 ? 'h-40' : 'h-28',
                )}
              >
                <Image
                  src={url}
                  alt="Ảnh đính kèm"
                  fill
                  sizes={
                    imageCount === 1
                      ? '(max-width: 768px) 78vw, 420px'
                      : imageCount <= 4
                        ? '(max-width: 768px) 39vw, 220px'
                        : '(max-width: 768px) 26vw, 140px'
                  }
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {text ? <p>{text}</p> : null}
    </div>
  );
}

export function SupportChatFabSheet(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthSessionReady = useAuthSessionReady();
  const isOpen = useSupportChatDrawerStore((state) => state.isOpen);
  const setDrawerOpen = useSupportChatDrawerStore((state) => state.setOpen);
  const closeDrawer = useSupportChatDrawerStore((state) => state.closeDrawer);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = Boolean(accessToken && user);
  const form = useForm<SupportChatDraftValues>({
    resolver: zodResolver(supportChatDraftSchema),
    defaultValues: { draft: '' },
  });
  const { register, handleSubmit, watch, setValue } = form;
  const draft = watch('draft');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [scrollToBottomTick, setScrollToBottomTick] = useState(0);
  const optimisticIdRef = useRef(-1);
  const optimisticImageUrlsRef = useRef(new Map<number, string[]>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const chatQuery = useQuery({
    queryKey: ['me', 'support-chat', 'detail'],
    queryFn: findOrCreateSupportChat,
    enabled: isOpen && isAuthSessionReady && isLoggedIn,
    staleTime: Infinity,
  });
  const chatId = chatQuery.data?.id ?? null;
  const messagesQuery = useInfiniteQuery({
    queryKey: ['me', 'support-chat', 'messages', chatId ?? 'none'],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) =>
      listSupportChatMessages(chatId!, {
        limit: 30,
        ...(pageParam !== null ? { cursor: pageParam } : {}),
      }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : null),
    enabled: isOpen && isLoggedIn && chatId !== null,
  });
  const selectedImagePreviews = useMemo(
    () => selectedImages.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    [selectedImages],
  );

  const onNewMessage = useCallback(
    (payload: unknown): void => {
      const message = payload as ChatMessage;
      if (!chatId || message.chatId !== chatId) return;
      setOptimisticMessages((previous) => {
        const incomingParsed = parseShopSupportMessageContent(message.content);
        const targetIndex = previous.findIndex((item) => {
          if (item.senderCustomerId !== user?.id || item.chatId !== message.chatId) return false;
          const optimisticParsed = parseShopSupportMessageContent(item.content);
          if (incomingParsed.imageUrls.length > 0) {
            return item.id < 0 && optimisticParsed.imageUrls.length > 0;
          }
          return optimisticParsed.text === incomingParsed.text;
        });
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
      setScrollToBottomTick((tick) => tick + 1);
    },
    [chatId, user?.id],
  );

  const onChatAssigned = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: ['me', 'support-chat', 'detail'] });
  }, [queryClient]);

  const socket = useSupportChatRealtime({
    chatId,
    enabled: isOpen && isLoggedIn && chatId !== null,
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
      if (!chatId || !user?.id) return null;
      const tempId = optimisticIdRef.current;
      optimisticIdRef.current -= 1;
      setOptimisticMessages((previous) => [
        ...previous,
        {
          id: tempId,
          chatId,
          senderType: 'CUSTOMER',
          senderCustomerId: user.id,
          senderEmployeeId: null,
          senderName: user.fullName ?? null,
          content,
          createdAt: new Date().toISOString(),
        },
      ]);
      return tempId;
    },
    [chatId, user?.fullName, user?.id],
  );

  const handleSendMessage = async (values: SupportChatDraftValues): Promise<void> => {
    if (!socket || !chatId) return;
    const textContent = values.draft.trim();
    const imagesToSend = selectedImages;
    if (!textContent && imagesToSend.length === 0) return;
    setValue('draft', '', { shouldValidate: true });
    setSelectedImages([]);
    setScrollToBottomTick((tick) => tick + 1);
    if (textContent) {
      pushOptimisticMessage(textContent);
      socket.emit('sendMessage', { chatId, content: textContent });
    }
    if (imagesToSend.length > 0) {
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
  }, [messages.length, scrollToBottomTick]);

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
      <Drawer direction="right" open={isOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="h-svh rounded-none border-l bg-background p-0 data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-none sm:data-[vaul-drawer-direction=right]:max-w-none md:data-[vaul-drawer-direction=right]:max-w-[420px]">
          <div className="flex h-full min-h-0 flex-col">
            <DrawerHeader className="border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <DrawerTitle className="text-[20px] font-semibold leading-none">
                  Chat hỗ trợ
                </DrawerTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-9 rounded-full"
                  aria-label="Đóng chat hỗ trợ"
                  onClick={closeDrawer}
                >
                  <XIcon className="size-6" />
                </Button>
              </div>
            </DrawerHeader>
            {!isAuthSessionReady ? (
              <div className="flex-1 p-4 text-sm text-muted-foreground">Đang tải...</div>
            ) : !isLoggedIn ? (
              <div className="flex flex-1 flex-col gap-4 p-4">
                <p className="text-sm text-muted-foreground">
                  Đăng nhập để chat trực tiếp với nhân viên hỗ trợ.
                </p>
                <PrimaryCtaButton
                  type="button"
                  className="w-full"
                  onClick={() => {
                    closeDrawer();
                    router.push('/login');
                  }}
                >
                  Đăng nhập
                </PrimaryCtaButton>
              </div>
            ) : chatQuery.isLoading || messagesQuery.isLoading ? (
              <div className="flex-1 p-4 text-sm text-muted-foreground">
                Đang tải cuộc hội thoại...
              </div>
            ) : chatQuery.isError || !chatQuery.data || messagesQuery.isError ? (
              <div className="flex-1 p-4 text-sm text-destructive">Không tải được tin nhắn.</div>
            ) : (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/25 p-4">
                  {messagesQuery.hasNextPage ? (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        disabled={messagesQuery.isFetchingNextPage}
                        className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
                        onClick={() => void messagesQuery.fetchNextPage()}
                      >
                        {messagesQuery.isFetchingNextPage ? 'Đang tải...' : 'Tải thêm tin nhắn'}
                      </button>
                    </div>
                  ) : null}
                  {timelineMessages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Chưa có tin nhắn. Hãy gửi câu hỏi cho chúng tôi.
                    </p>
                  ) : null}
                  {timelineMessages.map(
                    ({ message, parsed, showBoundaryTimestamp, boundaryLabel }, index) => {
                      const mine = message.senderType === 'CUSTOMER';
                      const isImageOnlyMessage = parsed.imageUrls.length > 0 && !parsed.text;
                      const previousMessage =
                        index > 0 ? timelineMessages[index - 1]?.message : undefined;
                      const nextMessage =
                        index < timelineMessages.length - 1
                          ? timelineMessages[index + 1]?.message
                          : undefined;
                      const sameSenderAsPrevious =
                        previousMessage !== undefined &&
                        previousMessage.senderType === message.senderType &&
                        previousMessage.senderCustomerId === message.senderCustomerId &&
                        previousMessage.senderEmployeeId === message.senderEmployeeId;
                      const sameSenderAsNext =
                        nextMessage !== undefined &&
                        nextMessage.senderType === message.senderType &&
                        nextMessage.senderCustomerId === message.senderCustomerId &&
                        nextMessage.senderEmployeeId === message.senderEmployeeId;
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'max-w-[78%] text-sm',
                                    isImageOnlyMessage ? 'px-0 py-0' : 'px-3 py-2',
                                    !isImageOnlyMessage && bubbleClassName,
                                  )}
                                >
                                  <SupportMessageBody content={message.content} />
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
                          className="relative size-14 overflow-hidden rounded-md border border-border bg-muted"
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
                      disabled={!socket || selectedImages.length >= MAX_CHAT_IMAGES}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlusIcon className="size-5 text-[#57585A]" />
                    </Button>
                    <input
                      type="text"
                      maxLength={MAX_DRAFT_LENGTH}
                      {...register('draft')}
                      placeholder="Nhập tin nhắn..."
                      className={INLINE_FIELD_CLASS}
                      disabled={!socket}
                    />
                    <PrimaryCtaButton
                      type="submit"
                      className="h-10! min-h-10! w-auto! shrink-0 px-5! md:h-12! md:min-h-12!"
                      disabled={!socket || (draft.trim() === '' && selectedImages.length === 0)}
                    >
                      Gửi
                    </PrimaryCtaButton>
                  </div>
                </form>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </TooltipProvider>
  );
}
