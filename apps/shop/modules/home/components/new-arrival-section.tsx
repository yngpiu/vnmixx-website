'use client';

import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { ProductCard } from '@/modules/common/components/product-card';
import { ProductCardSlider } from '@/modules/common/components/product-card-slider';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type NewArrivalSectionProps = {
  title: string;
  sort: 'newest' | 'best_selling';
  womenProducts: NewArrivalProduct[];
  menProducts: NewArrivalProduct[];
};

type BrandTab = {
  id: 'ivy-moda' | 'metagent';
  label: string;
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
      { id: 'ivy-moda', label: 'Nữ', products: womenProducts },
      { id: 'metagent', label: 'Nam', products: menProducts },
    ],
    [menProducts, womenProducts],
  );
  const [activeTabId, setActiveTabId] = useState<BrandTab['id']>('ivy-moda');
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  const activeTab = tabs.find((tab: BrandTab) => tab.id === activeTabId) ?? tabs[0]!;

  const activeTabHref =
    activeTab.id === 'ivy-moda' ? `/danh-muc/nu?sort=${sort}` : `/danh-muc/nam?sort=${sort}`;

  return (
    <section className="pb-16">
      <div className="shop-shell-container">
        <div className="mx-auto max-w-xl text-center">
          <h2
            suppressHydrationWarning
            className="text-2xl font-semibold md:tracking-[0.2em] uppercase md:text-3xl"
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
          {isHydrated ? (
            <ProductCardSlider key={activeTab.id} products={activeTab.products} />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {activeTab.products.map((product: NewArrivalProduct) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
        <div className="mt-8 flex justify-center">
          <PrimaryCtaButton
            ctaVariant="outline"
            asChild
            className="w-auto! min-w-[180px] normal-case font-medium"
          >
            <Link href={activeTabHref}>Xem tất cả</Link>
          </PrimaryCtaButton>
        </div>
      </div>
    </section>
  );
}
