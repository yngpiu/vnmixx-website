'use client';

import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import type { ShopColorOption, ShopSizeOption } from '@/modules/products/api/catalog';
import { CatalogFilterSection } from '@/modules/products/components/catalog-filter-section';
import { CATALOG_PRICE_RANGE_MAX } from '@/modules/products/constants/catalog';
import { formatCatalogPriceLabel } from '@/modules/products/utils/format-catalog-price-label';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import { Slider } from '@repo/ui/components/ui/slider';
import { cn } from '@repo/ui/lib/utils';

export type CategoryCatalogFiltersPanelProps = {
  sortedSizes: ShopSizeOption[];
  isSizesLoading: boolean;
  draftSizeIds: number[];
  onToggleDraftSize: (sizeId: number) => void;
  colorOptions: ShopColorOption[];
  isColorsLoading: boolean;
  draftColorIds: number[];
  onToggleDraftColor: (colorId: number) => void;
  draftPriceRange: [number, number];
  onDraftPriceRangeChange: (range: [number, number]) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
};

export function CategoryCatalogFiltersPanel({
  sortedSizes,
  isSizesLoading,
  draftSizeIds,
  onToggleDraftSize,
  colorOptions,
  isColorsLoading,
  draftColorIds,
  onToggleDraftColor,
  draftPriceRange,
  onDraftPriceRangeChange,
  onClearFilters,
  onApplyFilters,
}: CategoryCatalogFiltersPanelProps): React.JSX.Element {
  return (
    <>
      <CatalogFilterSection title="Size">
        {isSizesLoading ? (
          <div className="grid grid-cols-4 gap-x-3 gap-y-2.5">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-6 w-full rounded-br-[7px] rounded-bl-none rounded-tl-[7px] rounded-tr-none"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-x-3 gap-y-2.5">
            {sortedSizes.map((size) => {
              const isSelected = draftSizeIds.includes(size.id);
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => onToggleDraftSize(size.id)}
                  className={cn(
                    'flex size-full min-h-6 flex-col items-center justify-center wrap-break-word border border-[#E7E8E9] bg-background px-[3px] py-0.5 text-center text-[9px] font-medium leading-tight tracking-wide uppercase transition md:min-h-[26px] md:text-[10px] rounded-br-[8px] rounded-bl-none rounded-tl-[8px] rounded-tr-none',
                    isSelected
                      ? 'border-foreground bg-foreground text-background'
                      : 'text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                  )}
                >
                  {size.label}
                </button>
              );
            })}
          </div>
        )}
      </CatalogFilterSection>
      <CatalogFilterSection title="Màu sắc">
        {isColorsLoading ? (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="size-6 shrink-0 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {colorOptions.map((color) => {
              const isSelected = draftColorIds.includes(color.id);
              return (
                <button
                  key={color.id}
                  type="button"
                  title={color.name}
                  aria-label={`Lọc màu ${color.name}`}
                  onClick={() => onToggleDraftColor(color.id)}
                  className={cn(
                    'size-6 shrink-0 rounded-full border transition md:size-[26px]',
                    isSelected
                      ? 'border-foreground ring-1 ring-offset-1 ring-offset-background'
                      : 'border-border',
                  )}
                  style={{ backgroundColor: color.hexCode }}
                />
              );
            })}
          </div>
        )}
      </CatalogFilterSection>
      <CatalogFilterSection title="Mức giá">
        <div className="space-y-2">
          <Slider
            className="w-full **:data-[slot=slider-track]:h-[3px]!"
            min={0}
            max={CATALOG_PRICE_RANGE_MAX}
            step={50_000}
            value={draftPriceRange}
            onValueChange={(values) => {
              if (Array.isArray(values) && values.length === 2) {
                const nextMin = Math.min(values[0] ?? 0, values[1] ?? 0);
                const nextMax = Math.max(values[0] ?? 0, values[1] ?? 0);
                onDraftPriceRangeChange([nextMin, nextMax]);
              }
            }}
            aria-label="Khoảng giá"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground md:text-[11px]">
            <span>{formatCatalogPriceLabel(draftPriceRange[0])}</span>
            <span>{formatCatalogPriceLabel(draftPriceRange[1])}</span>
          </div>
        </div>
      </CatalogFilterSection>
      <div className="mt-6 flex gap-2.5 md:mt-7">
        <PrimaryCtaButton
          type="button"
          ctaVariant="outline"
          ctaSize="compact"
          className="min-h-8 min-w-0 flex-1"
          onClick={onClearFilters}
        >
          Bỏ lọc
        </PrimaryCtaButton>
        <PrimaryCtaButton
          type="button"
          ctaVariant="filled"
          ctaSize="compact"
          className="min-h-8 min-w-0 flex-1"
          onClick={onApplyFilters}
        >
          Lọc
        </PrimaryCtaButton>
      </div>
    </>
  );
}
