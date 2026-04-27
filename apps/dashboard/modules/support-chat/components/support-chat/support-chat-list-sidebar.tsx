'use client';

import type { ChatSummary } from '@/modules/support-chat/types/support-chat';
import { Avatar, AvatarFallback } from '@repo/ui/components/ui/avatar';
import { ScrollArea } from '@repo/ui/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { CircleAlertIcon, Loader2Icon, SearchIcon } from 'lucide-react';
import {
  formatMessageTime,
  parseMessagePayload,
  senderInitial,
  shortDisplayName,
} from './support-chat.utils';

type Props = {
  chats: ChatSummary[];
  isLoading: boolean;
  keyword: string;
  onKeywordChange: (value: string) => void;
  assignedToMe: boolean;
  onAssignedToMeChange: (value: boolean) => void;
  selectedChatId: number | null;
  lastMessageSenderByChatId: Record<number, 'CUSTOMER' | 'EMPLOYEE'>;
  onSelectChat: (chatId: number) => void;
};

export function SupportChatListSidebar({
  chats,
  isLoading,
  keyword,
  onKeywordChange,
  assignedToMe,
  onAssignedToMeChange,
  selectedChatId,
  lastMessageSenderByChatId,
  onSelectChat,
}: Props): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-col rounded-xl border bg-card">
      <div className="space-y-3 border-b p-4">
        <label className="flex h-10 items-center rounded-md border border-input ps-2">
          <SearchIcon size={15} className="me-2 stroke-slate-500" />
          <span className="sr-only">Tìm hội thoại</span>
          <input
            type="text"
            className="w-full flex-1 bg-transparent text-sm outline-none"
            placeholder="Tìm kiếm..."
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="me-2 inline-flex size-5 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Hướng dẫn tìm kiếm"
              >
                <CircleAlertIcon className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Tìm kiếm theo tên, số điện thoại hoặc email của khách hàng.</p>
            </TooltipContent>
          </Tooltip>
        </label>
        <div className="inline-flex w-full rounded-md border border-input p-1">
          <button
            type="button"
            className={cn(
              'flex-1 rounded-sm px-2 py-1 text-xs transition-colors',
              !assignedToMe
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onAssignedToMeChange(false)}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 rounded-sm px-2 py-1 text-xs transition-colors',
              assignedToMe
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onAssignedToMeChange(true)}
          >
            Chat của tôi
          </button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Không có hội thoại phù hợp.
          </p>
        ) : (
          <div className="p-2">
            {chats.map((chat) => {
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
                  onClick={() => onSelectChat(chat.id)}
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
  );
}
