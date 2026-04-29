'use client';

import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const NewArrivalProductsSlider = dynamic(
  () =>
    import('@/modules/home/components/new-arrival-products-slider').then(
      (module) => module.NewArrivalProductsSlider,
    ),
  {
    ssr: false,
    loading: () => <div className="h-[520px] w-full animate-pulse bg-muted/20" aria-hidden />,
  },
);

type NewArrivalSectionProps = {
  title: string;
  sort: 'newest' | 'best_selling';
  womenProducts: NewArrivalProduct[];
  menProducts: NewArrivalProduct[];
};

type BrandTab = {
  id: 'ivy-moda' | 'metagent';
  label: string;
  categorySlug: string;
  products: NewArrivalProduct[];
};

export function NewArrivalSection({
  title,
  sort,
  womenProducts,
  menProducts,
}: NewArrivalSectionProps): React.JSX.Element {
  const tabs = useMemo<BrandTab[]>(
    () => [
      { id: 'ivy-moda', label: 'Nữ', categorySlug: 'nu', products: womenProducts },
      { id: 'metagent', label: 'Nam', categorySlug: 'nam', products: menProducts },
    ],
    [menProducts, womenProducts],
  );
  const [activeTabId, setActiveTabId] = useState<BrandTab['id']>('ivy-moda');
  const activeTab = tabs.find((tab: BrandTab) => tab.id === activeTabId) ?? tabs[0]!;

  return (
    <section className="pb-16">
      <div className="mx-auto w-full max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px]">
        <div className="mx-auto max-w-xl text-center">
          <h2
            suppressHydrationWarning
            className="text-3xl font-semibold tracking-[0.2em] uppercase"
          >
            {title}
          </h2>
        </div>
        <div className="mt-4 flex items-center justify-center gap-8 text-base md:text-lg">
          {tabs.map((tab: BrandTab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`border-b pb-1 transition ${
                  isActive
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="mt-8">
          <NewArrivalProductsSlider key={activeTab.id} products={activeTab.products} />
        </div>
        <div className="mt-8 flex justify-center">
          <PrimaryCtaButton ctaVariant="outline" asChild className="w-auto! min-w-[180px]">
            <Link href={`/danh-muc/${activeTab.categorySlug}?sort=${sort}`}>Xem tất cả</Link>
          </PrimaryCtaButton>
        </div>
      </div>
    </section>
  );
}
