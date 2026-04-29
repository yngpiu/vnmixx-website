'use client';

import type { HeaderCategoryNode, HeaderTopLink } from '@/modules/header/types/header';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@repo/ui/components/ui/navigation-menu';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

interface DesktopNavProps {
  categoryTree: HeaderCategoryNode[];
  auxiliaryLinks: HeaderTopLink[];
}

function getCategoryHref(categorySlug: string): string {
  if (categorySlug === 've-chung-toi') {
    return '/about';
  }
  return `/danh-muc/${categorySlug}`;
}

function getDropdownLayoutClass(secondLevelCount: number): {
  widthClassName: string;
  gridClassName: string;
} {
  if (secondLevelCount <= 2) {
    return {
      widthClassName: 'w-[92vw] md:!w-[520px] md:!max-w-none',
      gridClassName: 'grid-cols-2',
    };
  }
  if (secondLevelCount === 3) {
    return {
      widthClassName: 'w-[92vw] md:!w-[760px] md:!max-w-none',
      gridClassName: 'grid-cols-3',
    };
  }
  return {
    widthClassName: 'w-[92vw] md:!w-[980px] md:!max-w-none',
    gridClassName: 'grid-cols-4',
  };
}

export function DesktopNav({ categoryTree, auxiliaryLinks }: DesktopNavProps): React.JSX.Element {
  return (
    <NavigationMenu
      viewport={false}
      className="hidden min-w-0 flex-1 justify-start md:flex"
      aria-label="Điều hướng chính"
    >
      <NavigationMenuList className="gap-1.5">
        {categoryTree.map((topLevelCategory) => {
          const hasChildren = topLevelCategory.children.length > 0;
          const dropdownLayoutClass = getDropdownLayoutClass(topLevelCategory.children.length);
          if (!hasChildren) {
            return (
              <NavigationMenuItem key={topLevelCategory.id}>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link
                    href={getCategoryHref(topLevelCategory.slug)}
                    className="h-9 px-2.5 text-sm font-semibold uppercase tracking-wide xl:text-[15px]"
                  >
                    {topLevelCategory.name}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          }
          return (
            <NavigationMenuItem key={topLevelCategory.id}>
              <NavigationMenuTrigger className="h-9 px-2.5 text-sm font-semibold uppercase tracking-wide data-[state=open]:text-destructive xl:text-[15px]">
                {topLevelCategory.name}
              </NavigationMenuTrigger>
              <NavigationMenuContent
                className={cn(
                  'mt-3 min-w-0 border border-border/50 bg-background p-5 shadow-none',
                  dropdownLayoutClass.widthClassName,
                )}
              >
                <div className={cn('grid gap-5', dropdownLayoutClass.gridClassName)}>
                  {topLevelCategory.children.map((secondLevelCategory) => (
                    <div key={secondLevelCategory.id} className="space-y-2">
                      <Link
                        href={getCategoryHref(secondLevelCategory.slug)}
                        className="block text-sm font-semibold uppercase transition-colors hover:text-destructive"
                      >
                        {secondLevelCategory.name}
                      </Link>
                      <div className="space-y-1.5">
                        {secondLevelCategory.children.map((thirdLevelCategory) => (
                          <Link
                            key={thirdLevelCategory.id}
                            href={getCategoryHref(thirdLevelCategory.slug)}
                            className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {thirdLevelCategory.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}
        {auxiliaryLinks.map((link) => (
          <NavigationMenuItem key={link.label}>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <Link
                href={link.href}
                className={cn(
                  'h-9 px-2.5 text-sm font-semibold uppercase tracking-wide xl:text-[15px]',
                  link.isHighlighted ? 'text-destructive' : 'text-foreground',
                )}
              >
                {link.label}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
