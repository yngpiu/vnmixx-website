'use client';

import { HeadphonesIcon, SearchIcon, UserRoundIcon } from 'lucide-react';
import Link from 'next/link';

const MOBILE_BOTTOM_LINKS = [
  { label: 'Tìm kiếm', href: '/search', icon: SearchIcon },
  { label: 'Đăng nhập', href: '/account', icon: UserRoundIcon },
  { label: 'Trợ giúp', href: '/support', icon: HeadphonesIcon },
] as const;

export function MobileBottomNav(): React.JSX.Element {
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
      <ul className="grid h-16 grid-cols-3">
        {MOBILE_BOTTOM_LINKS.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1 text-xs"
            >
              <item.icon className="size-4 stroke-[1.75]" />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
