'use client';

import { NewArrivalProductsSlider } from '@/modules/home/components/new-arrival-products-slider';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import { useMemo, useState } from 'react';

type NewArrivalSectionProps = {
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
  womenProducts,
  menProducts,
}: NewArrivalSectionProps): React.JSX.Element {
  const tabs = useMemo<BrandTab[]>(
    () => [
      { id: 'ivy-moda', label: 'IVY moda', categorySlug: 'nu', products: womenProducts },
      { id: 'metagent', label: 'Metagent', categorySlug: 'nam', products: menProducts },
    ],
    [menProducts, womenProducts],
  );
  const [activeTabId, setActiveTabId] = useState<BrandTab['id']>('ivy-moda');
  const activeTab = tabs.find((tab: BrandTab) => tab.id === activeTabId) ?? tabs[0];

  return (
    <section className="pb-16">
      <div className="mx-auto w-full max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px]">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-[0.2em] uppercase">New Arrival</h2>
        </div>
        <div className="mt-4 flex items-center justify-center gap-8 text-sm">
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
          <NewArrivalProductsSlider
            key={activeTab.id}
            categorySlug={activeTab.categorySlug}
            products={activeTab.products}
          />
        </div>
      </div>
    </section>
  );
}
