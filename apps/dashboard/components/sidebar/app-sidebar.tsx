'use client';

import type { ComponentProps } from 'react';
import { Fragment } from 'react';

import { DashboardLogo } from '@/components/brand/dashboard-logo';
import { NavMain } from '@/components/sidebar/nav-main';
import { sidebarSections } from '@/config/sidebar-menu';
import { dashboardRoutes } from '@/lib/routes';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@repo/ui/components/ui/sidebar';
import Link from 'next/link';

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="min-h-10 py-1.5" asChild>
              <Link href={dashboardRoutes.overview} title="VNMIXX" className="overflow-hidden">
                <DashboardLogo
                  width={120}
                  height={32}
                  priority
                  imageClassName="max-h-6 max-w-[min(100%,7.5rem)] shrink-0 object-left transition-[max-width] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:max-h-5 group-data-[collapsible=icon]:max-w-5 group-data-[collapsible=icon]:object-center"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sidebarSections.map((section, index) => (
          <Fragment key={section.id}>
            {index > 0 ? <SidebarSeparator className="mx-0" /> : null}
            <NavMain
              groupLabel={section.groupLabel}
              groupLabelClassName={section.groupLabelClassName}
              items={section.items}
            />
          </Fragment>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
