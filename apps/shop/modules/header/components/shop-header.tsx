import { listShopCategories } from '@/modules/header/api/categories';
import { HEADER_TOP_LINKS } from '@/modules/header/constants/header-links';
import type { HeaderCategoryNode } from '@/modules/header/types/header';
import { buildHeaderCategoryTree } from '@/modules/header/utils/header-nav';
import Image from 'next/image';
import Link from 'next/link';
import { DesktopNav } from './desktop-nav';
import { HeaderActions } from './header-actions';
import { HeaderSearch } from './header-search';
import { MobileBottomNav } from './mobile-bottom-nav';
import { MobileHeader } from './mobile-header';
import { MobileNavDrawer } from './mobile-nav-drawer';

export async function ShopHeader(): Promise<React.JSX.Element> {
  const categories = await listShopCategories();
  const categoryTree = buildHeaderCategoryTree(categories);
  const auxiliaryLinks = HEADER_TOP_LINKS;
  const desktopCategoryTree: HeaderCategoryNode[] = [
    ...categoryTree,
    {
      id: -1,
      name: 'Về chúng tôi',
      slug: 've-chung-toi',
      sortOrder: 9999,
      isFeatured: false,
      showInHeader: true,
      children: [],
    },
  ];
  return (
    <header className="sticky top-0 z-40 bg-background">
      <MobileHeader />
      <div className="hidden md:block">
        <div className="shop-shell-container relative flex h-[72px] items-center border-b">
          <div className="min-w-0 flex-1">
            <DesktopNav categoryTree={desktopCategoryTree} auxiliaryLinks={auxiliaryLinks} />
          </div>
          <Link
            href="/"
            className="absolute left-[44%] block h-[42px] w-[150px] -translate-x-1/2 shrink-0 lg:left-[46%] xl:left-1/2 xl:h-[48px] xl:w-[170px]"
            aria-label="Trang chủ"
          >
            <Image
              src="/images/logo.png"
              alt="IVY moda"
              fill
              sizes="(min-width: 1280px) 170px, 150px"
              priority
              className="object-contain"
            />
          </Link>
          <div className="ml-auto flex flex-1 items-center justify-end gap-3">
            <HeaderSearch />
            <HeaderActions />
          </div>
        </div>
      </div>
      <MobileNavDrawer categoryTree={categoryTree} />
      <MobileBottomNav />
    </header>
  );
}
