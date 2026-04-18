'use client';

import { DashboardSearchCommand } from '@/components/header/dashboard-search-command';
import { HeaderActions } from '@/components/header/header-actions';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { Separator } from '@repo/ui/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@repo/ui/components/ui/sidebar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border/60 px-2.5 sm:px-3">
          <div className="flex shrink-0 items-center gap-1.5">
            <SidebarTrigger className="-ml-0.5 sm:-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-1.5 sm:mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
          </div>
          <div className="min-w-0 flex-1 px-1 sm:px-1.5">
            <DashboardSearchCommand className="mx-auto" />
          </div>
          <HeaderActions />
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
