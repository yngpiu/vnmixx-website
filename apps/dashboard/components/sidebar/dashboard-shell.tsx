'use client';

import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { dashboardBreadcrumbs } from '@/lib/routes';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb';
import { Separator } from '@repo/ui/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@repo/ui/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const breadcrumbs = dashboardBreadcrumbs(pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/60">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => {
                  const isLastBreadcrumb = index === breadcrumbs.length - 1;
                  return (
                    <Fragment key={`${breadcrumb.label}-${index}`}>
                      {index > 0 ? <BreadcrumbSeparator className="hidden md:block" /> : null}
                      <BreadcrumbItem>
                        {isLastBreadcrumb || !breadcrumb.href ? (
                          <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={breadcrumb.href}>{breadcrumb.label}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
