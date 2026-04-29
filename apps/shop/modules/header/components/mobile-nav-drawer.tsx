'use client';

import { useHeaderUiStore } from '@/modules/header/stores/header-ui-store';
import type { HeaderCategoryNode } from '@/modules/header/types/header';
import { Button } from '@repo/ui/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@repo/ui/components/ui/sheet';
import { cn } from '@repo/ui/lib/utils';
import { XIcon } from 'lucide-react';
import Link from 'next/link';

interface MobileNavDrawerProps {
  categoryTree: HeaderCategoryNode[];
}

const MOBILE_EXTRA_ROOT_CATEGORIES: HeaderCategoryNode[] = [
  {
    id: -1,
    name: 'Về chúng tôi',
    slug: 've-chung-toi',
    sortOrder: 9999,
    isFeatured: false,
    showInHeader: true,
    children: [],
  },
] as const;

function getCategoryHref(categorySlug: string): string {
  if (categorySlug === 've-chung-toi') {
    return '/about';
  }
  return `/danh-muc/${categorySlug}`;
}

function hasCategoryChildren(category: HeaderCategoryNode): boolean {
  return category.children.length > 0;
}

function getCategoryLabelClassName(level: 1 | 2 | 3): string {
  if (level === 1) {
    return 'py-2 text-[17px] leading-6 font-semibold uppercase';
  }
  if (level === 2) {
    return 'py-2 text-[16px] leading-6 font-medium uppercase text-foreground/90';
  }
  return 'py-1.5 text-[15px] text-muted-foreground';
}

interface CategoryMenuNodeProps {
  node: HeaderCategoryNode;
  level: 1 | 2 | 3;
  expandedSlugs: string[];
  onToggle: (slug: string) => void;
}

function CategoryMenuNode({
  node,
  level,
  expandedSlugs,
  onToggle,
}: CategoryMenuNodeProps): React.JSX.Element {
  const isExpanded = expandedSlugs.includes(node.slug);
  const hasChildren = hasCategoryChildren(node);
  return (
    <div className={cn('space-y-1', level > 1 ? 'pl-4' : undefined)}>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={getCategoryHref(node.slug)}
          className={cn(
            getCategoryLabelClassName(level),
            node.isFeatured ? 'text-destructive' : undefined,
          )}
        >
          {node.name}
        </Link>
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground size-7 rounded-full text-lg"
            onClick={() => onToggle(node.slug)}
            aria-label={isExpanded ? 'Thu gọn danh mục' : 'Mở rộng danh mục'}
          >
            {isExpanded ? '-' : '+'}
          </Button>
        ) : null}
      </div>
      {hasChildren && isExpanded ? (
        <div className={cn('space-y-1 pb-1', level === 1 ? undefined : 'pl-2')}>
          {node.children.map((childNode) => (
            <CategoryMenuNode
              key={childNode.id}
              node={childNode}
              level={level === 1 ? 2 : 3}
              expandedSlugs={expandedSlugs}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MobileNavDrawer({ categoryTree }: MobileNavDrawerProps): React.JSX.Element {
  const isMobileDrawerOpen = useHeaderUiStore((state) => state.isMobileDrawerOpen);
  const setMobileDrawerOpen = useHeaderUiStore((state) => state.setMobileDrawerOpen);
  const expandedMobileCategorySlugs = useHeaderUiStore(
    (state) => state.expandedMobileCategorySlugs,
  );
  const toggleMobileCategory = useHeaderUiStore((state) => state.toggleMobileCategory);
  const drawerCategories: HeaderCategoryNode[] = [...categoryTree, ...MOBILE_EXTRA_ROOT_CATEGORIES];
  return (
    <Sheet open={isMobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
      <SheetContent
        side="left"
        className="h-svh w-screen max-w-none overflow-y-auto bg-muted p-0"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">Danh mục sản phẩm</SheetTitle>
        <div className="px-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground size-8 rounded-full"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Đóng menu"
          >
            <XIcon className="size-4 stroke-[1.75]" />
          </Button>
        </div>
        <div className="space-y-4 px-4 pb-8">
          <div className="rounded-2xl bg-primary px-4 py-3 text-center text-base font-semibold text-primary-foreground">
            Đăng nhập
          </div>
          <div className="space-y-1">
            {drawerCategories.map((category) => {
              return (
                <CategoryMenuNode
                  key={category.id}
                  node={category}
                  level={1}
                  expandedSlugs={expandedMobileCategorySlugs}
                  onToggle={toggleMobileCategory}
                />
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
