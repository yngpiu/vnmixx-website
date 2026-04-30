import { serverApi, ServerApiError } from '@/lib/server-api';
import { ProductDetailPageContent } from '@/modules/products/components/product-detail-page-content';
import type { ShopProductDetail } from '@/modules/products/types/product-detail';
import type { ShopProductReviewsResult } from '@/modules/products/types/product-reviews';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps): Promise<{ title: string }> {
  const { slug } = await props.params;
  try {
    const product = await serverApi.get<ShopProductDetail>(
      `/products/${encodeURIComponent(slug)}`,
      { skipAuth: true },
    );
    return { title: `${product.name} | VNMIXX Shop` };
  } catch {
    return { title: 'Sản phẩm | VNMIXX Shop' };
  }
}

const emptyInitialReviews: ShopProductReviewsResult = {
  data: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
  reviewCount: 0,
  averageRating: null,
  ratingBreakdown: { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 },
};

export default async function ProductDetailPage(props: PageProps): Promise<React.JSX.Element> {
  const { slug } = await props.params;
  const encodedSlug = encodeURIComponent(slug);
  try {
    const [product, initialPublicReviews] = await Promise.all([
      serverApi.get<ShopProductDetail>(`/products/${encodedSlug}`, { skipAuth: true }),
      serverApi
        .get<ShopProductReviewsResult>(`/products/${encodedSlug}/reviews?page=1&limit=10`, {
          skipAuth: true,
        })
        .catch((): ShopProductReviewsResult => emptyInitialReviews),
    ]);
    return (
      <ProductDetailPageContent product={product} initialPublicReviews={initialPublicReviews} />
    );
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
