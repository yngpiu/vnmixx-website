'use client';

import { fetchProductReviews } from '@/modules/products/api/catalog';
import { ReviewStarsInline } from '@/modules/products/components/review-stars-inline';
import type {
  ShopProductRatingBreakdown,
  ShopProductReviewItem,
  ShopProductReviewsResult,
} from '@/modules/products/types/product-reviews';
import { Button } from '@repo/ui/components/ui/button';
import { useCallback, useState } from 'react';

type ProductDetailReviewsSectionProps = {
  productSlug: string;
  initial: ShopProductReviewsResult;
};

const RATING_ORDER_DESC = [5, 4, 3, 2, 1] as const;

function getBreakdownCount(stars: number, breakdown: ShopProductRatingBreakdown): number {
  switch (stars) {
    case 1:
      return breakdown.star1;
    case 2:
      return breakdown.star2;
    case 3:
      return breakdown.star3;
    case 4:
      return breakdown.star4;
    case 5:
      return breakdown.star5;
    default:
      return 0;
  }
}

function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Storefront product reviews: histogram by star + paginated list + load more.
 */
export function ProductDetailReviewsSection({
  productSlug,
  initial,
}: ProductDetailReviewsSectionProps): React.JSX.Element {
  const [items, setItems] = useState<ShopProductReviewItem[]>(() => initial.data);
  const [loadedPage, setLoadedPage] = useState<number>(initial.meta.page);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const totalPages: number = Math.max(1, initial.meta.totalPages);
  const pageSize: number = initial.meta.limit;
  const canLoadMore: boolean = loadedPage < totalPages;

  const loadMore = useCallback(async (): Promise<void> => {
    if (!canLoadMore || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const nextPage: number = loadedPage + 1;
      const next: ShopProductReviewsResult = await fetchProductReviews(productSlug, {
        page: nextPage,
        limit: pageSize,
      });
      setItems((previous) => [...previous, ...next.data]);
      setLoadedPage(next.meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải thêm đánh giá.');
    } finally {
      setLoading(false);
    }
  }, [canLoadMore, loading, loadedPage, pageSize, productSlug]);

  if (initial.reviewCount === 0) {
    return (
      <section className="mt-8  pt-6" aria-labelledby="pdp-reviews-heading">
        <h2
          id="pdp-reviews-heading"
          className="text-sm font-semibold uppercase tracking-wide text-foreground"
        >
          Đánh giá từ khách hàng
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">Chưa có đánh giá cho sản phẩm này.</p>
      </section>
    );
  }

  return (
    <section className="mt-8  pt-6" aria-labelledby="pdp-reviews-heading">
      <h2
        id="pdp-reviews-heading"
        className="text-sm font-semibold uppercase tracking-wide text-foreground"
      >
        Đánh giá từ khách hàng
      </h2>
      <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,240px)_1fr] md:gap-12">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Phân bố theo sao
          </p>
          <ul className="space-y-2.5">
            {RATING_ORDER_DESC.map((stars) => {
              const count = getBreakdownCount(stars, initial.ratingBreakdown);
              const widthPct: number =
                initial.reviewCount > 0 ? Math.min(100, (count / initial.reviewCount) * 100) : 0;
              return (
                <li key={stars} className="flex items-center gap-2 text-sm">
                  <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
                    {stars} sao
                  </span>
                  <div
                    className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-amber-400 transition-[width]"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bình luận
          </p>
          <ul className="divide-y divide-border">
            {items.map((review) => (
              <li key={review.id} className="py-5 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-medium text-foreground">
                    {review.authorDisplayName}
                  </span>
                  <ReviewStarsInline rating={review.rating} className="text-amber-400" />
                  <time className="text-xs text-muted-foreground" dateTime={review.createdAt}>
                    {formatReviewDate(review.createdAt)}
                  </time>
                </div>
                {review.title ? (
                  <p className="mt-2 text-sm font-medium text-foreground">{review.title}</p>
                ) : null}
                {review.content ? (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {review.content}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          {canLoadMore ? (
            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                disabled={loading}
                onClick={() => void loadMore()}
              >
                {loading ? 'Đang tải…' : 'Xem thêm đánh giá'}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
