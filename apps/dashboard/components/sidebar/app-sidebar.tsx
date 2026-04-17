'use client';

import type { ComponentProps } from 'react';
import { Fragment, useMemo } from 'react';

import { NavMain } from '@/components/sidebar/nav-main';
import { NavUser } from '@/components/sidebar/nav-user';
import { sidebarSections } from '@/config/sidebar-menu';
import { pravatarFromEmail } from '@/lib/avatar';
import { dashboardRoutes } from '@/lib/routes';
import { useAuthStore } from '@/stores/auth-store';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@repo/ui/components/ui/sidebar';
import Image from 'next/image';
import Link from 'next/link';

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.user);

  const navUser = useMemo(() => {
    if (profile) {
      return {
        name: profile.fullName,
        email: profile.email,
        avatar: profile.avatarUrl?.trim() || pravatarFromEmail(profile.email),
      };
    }
    if (accessToken) {
      return {
        name: 'Đang tải…',
        email: '',
        avatar: undefined,
      };
    }
    return {
      name: 'Khách',
      email: '',
      avatar: undefined,
    };
  }, [accessToken, profile]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="min-h-10 py-1.5" asChild>
              <Link href={dashboardRoutes.root} title="VNMIXX" className="overflow-hidden">
                <Image
                  src="/images/logo.png"
                  alt="VNMIXX"
                  width={120}
                  height={32}
                  priority
                  unoptimized
                  style={{ width: 'auto' }}
                  className="h-6 w-auto max-w-[min(100%,7.5rem)] shrink-0 object-contain object-left transition-[max-width] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:max-h-5 group-data-[collapsible=icon]:max-w-5 group-data-[collapsible=icon]:object-center"
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
      <SidebarFooter>
        <NavUser user={navUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
