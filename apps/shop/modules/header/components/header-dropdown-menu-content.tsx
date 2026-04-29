'use client';

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@repo/ui/components/ui/dropdown-menu';
import Link from 'next/link';

type HeaderMenuIcon = React.ComponentType<{ className?: string }>;

export type HeaderDropdownMenuItem = {
  label: string;
  icon: HeaderMenuIcon;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

interface HeaderDropdownMenuContentProps {
  title: string;
  items: HeaderDropdownMenuItem[];
}

export function HeaderDropdownMenuContent({
  title,
  items,
}: HeaderDropdownMenuContentProps): React.JSX.Element {
  return (
    <DropdownMenuContent align="end" className="w-[340px] rounded-none p-0">
      <div className="px-4 py-3 text-base font-semibold leading-4">{title}</div>
      <DropdownMenuSeparator className="my-0" />
      <div className="px-4 py-1">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            asChild={Boolean(item.href)}
            className="text-muted-foreground h-auto rounded-none px-2 py-2 text-[14px] leading-4 font-semibold transition-colors hover:text-primary focus:text-primary data-highlighted:text-primary"
            onClick={item.href ? undefined : item.onClick}
            disabled={item.disabled}
          >
            {item.href ? (
              <Link href={item.href}>
                <item.icon className="mr-2.5 size-4 stroke-[1.75]" />
                <span>{item.label}</span>
              </Link>
            ) : (
              <button type="button" className="flex w-full items-center" disabled={item.disabled}>
                <item.icon className="mr-2.5 size-4 stroke-[1.75]" />
                <span>{item.label}</span>
              </button>
            )}
          </DropdownMenuItem>
        ))}
      </div>
    </DropdownMenuContent>
  );
}
