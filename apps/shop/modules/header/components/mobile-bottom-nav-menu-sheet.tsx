'use client';

import { Sheet, SheetContent, SheetTitle } from '@repo/ui/components/ui/sheet';
import Link from 'next/link';

type MenuItemIcon = React.ComponentType<{ className?: string }>;

export type MobileBottomNavMenuItem = {
  label: string;
  icon: MenuItemIcon;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

interface MobileBottomNavMenuSheetProps {
  title: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  items: MobileBottomNavMenuItem[];
}

export function MobileBottomNavMenuSheet({
  title,
  isOpen,
  onOpenChange,
  items,
}: MobileBottomNavMenuSheetProps): React.JSX.Element {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bottom-16 max-h-[calc(100svh-4rem)] overflow-y-auto rounded-t-xl p-0 md:hidden"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="border-b px-4 py-3 text-base font-semibold">{title}</div>
        <ul className="px-4 py-1">
          {items.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground flex w-full items-center gap-2.5 py-2.5 text-left text-[14px] leading-4 font-semibold transition-colors hover:text-primary"
                  onClick={() => onOpenChange(false)}
                >
                  <item.icon className="size-4 stroke-[1.75]" />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="text-muted-foreground flex w-full items-center gap-2.5 py-2.5 text-left text-[14px] leading-4 font-semibold transition-colors hover:text-primary"
                  onClick={item.onClick}
                  disabled={item.disabled}
                >
                  <item.icon className="size-4 stroke-[1.75]" />
                  <span>{item.label}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
