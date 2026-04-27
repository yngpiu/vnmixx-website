import { SupportChatManagementView } from '@/modules/support-chat/components/support-chat/support-chat-management-view';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Tin nhắn hỗ trợ' };

function SupportChatsViewSkeleton(): React.JSX.Element {
  return (
    <div className="flex h-[72vh] animate-pulse gap-4">
      <div className="w-full max-w-sm rounded-xl border bg-muted/30" />
      <div className="hidden flex-1 rounded-xl border bg-muted/30 md:block" />
    </div>
  );
}

export default function SupportChatsCustomerPage(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <Suspense fallback={<SupportChatsViewSkeleton />}>
        <SupportChatManagementView />
      </Suspense>
    </div>
  );
}
