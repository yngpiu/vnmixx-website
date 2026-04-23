'use client';

import type { SidebarNavItem } from '@/config/sidebar-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/ui/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@repo/ui/components/ui/sidebar';
import { cn } from '@repo/ui/lib/utils';
import { ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function itemHasNestedContent(item: SidebarNavItem) {
  return Boolean((item.items?.length ?? 0) > 0 || (item.groups?.length ?? 0) > 0);
}

function pathnameMatchesItem(pathname: string, item: SidebarNavItem) {
  const flat = item.items?.some((sub) => pathname === sub.url) ?? false;
  const grouped = item.groups?.some((g) => g.items.some((sub) => pathname === sub.url)) ?? false;
  return pathname === item.url || flat || grouped;
}

export function NavMain({
  items,
  groupLabel,
  groupLabelClassName,
}: {
  groupLabel?: string;
  /** Gắn thêm class cho nhãn nhóm (tuỳ chỉnh giao diện). */
  groupLabelClassName?: string;
  items: SidebarNavItem[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {groupLabel ? (
        <SidebarGroupLabel className={cn(groupLabelClassName)}>{groupLabel}</SidebarGroupLabel>
      ) : null}
      <SidebarMenu>
        {items.map((item) => {
          const isActive = item.isActive ?? pathnameMatchesItem(pathname, item);
          const hasNested = itemHasNestedContent(item);

          return (
            <Collapsible key={item.title} asChild defaultOpen={isActive}>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {hasNested ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90">
                        <ChevronRightIcon />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2">
                      {item.subtitle ? (
                        <p className="mx-3.5 px-2.5 text-xs text-muted-foreground">
                          {item.subtitle}
                        </p>
                      ) : null}
                      {item.groups?.map((group) => (
                        <div key={group.title}>
                          <div className="mx-3.5 px-2.5 pb-1 pt-1 text-xs font-medium text-sidebar-foreground">
                            {group.title}
                          </div>
                          <SidebarMenuSub>
                            {group.items.map((subItem) => (
                              <SidebarMenuSubItem key={`${group.title}-${subItem.title}`}>
                                <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </div>
                      ))}
                      {item.items?.length && !item.groups?.length ? (
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      ) : null}
                    </CollapsibleContent>
                  </>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
