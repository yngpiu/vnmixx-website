export type ShopProductReviewItem = {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  createdAt: string;
  authorDisplayName: string;
};

/** Visible reviews only; counts sum to reviewCount when all pages loaded (same totals on every page). */
export type ShopProductRatingBreakdown = {
  star1: number;
  star2: number;
  star3: number;
  star4: number;
  star5: number;
};

export type ShopProductReviewsResult = {
  data: ShopProductReviewItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  reviewCount: number;
  averageRating: number | null;
  ratingBreakdown: ShopProductRatingBreakdown;
};
