import { Star } from 'lucide-react';
import type { JSX } from 'react';

export type ProductDetailReviewSummaryProps = {
  reviewCount: number;
  averageRating: number | null;
};

/**
 * Product rating row: five stars (decorative full amber when there are no reviews yet)
 * plus review count, similar to common storefront PDP patterns.
 */
export function ProductDetailReviewSummary({
  reviewCount,
  averageRating,
}: ProductDetailReviewSummaryProps): JSX.Element {
  const filledStars: number =
    reviewCount === 0 ? 5 : Math.min(5, Math.max(0, Math.round(averageRating ?? 0)));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((index) => {
          const isFilled: boolean = index <= filledStars;
          return (
            <Star
              key={index}
              className={
                isFilled
                  ? 'size-4 shrink-0 fill-amber-400 text-amber-400 md:size-[18px]'
                  : 'size-4 shrink-0 fill-none text-muted-foreground/45 md:size-[18px]'
              }
              strokeWidth={isFilled ? 0 : 1.2}
            />
          );
        })}
      </span>
      <span className="text-sm text-muted-foreground">({reviewCount} đánh giá)</span>
    </div>
  );
}
