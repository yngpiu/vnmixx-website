import { serverApi, ServerApiError } from '@/lib/server-api';
import { buildProductHref, parseProductRouteKey } from '@/modules/common/utils/shop-routes';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import { fetchSuggestedProductsByCategory } from '@/modules/products/api/catalog';
import { ProductDetailPageContent } from '@/modules/products/components/product-detail-page-content';
import type { ShopProductDetail } from '@/modules/products/types/product-detail';
import type { ShopProductReviewsResult } from '@/modules/products/types/product-reviews';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    fromCategorySlug?: string | string[];
    fromCategoryName?: string | string[];
  }>;
}

export const dynamic = 'force-dynamic';
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug: routeKey } = await props.params;
  const productSlug = parseProductRouteKey(routeKey);
  if (!productSlug) {
    return {
      title: 'Sản phẩm',
      description: 'Thông tin chi tiết sản phẩm tại VNMIXX Shop.',
      alternates: {
        canonical: '/products',
      },
    };
  }
  try {
    const product = await serverApi.get<ShopProductDetail>(`/products/slug/${productSlug}`, {
      skipAuth: true,
    });
    const title = product.name;
    const description = product.description ?? `Chi tiết sản phẩm ${product.name} tại VNMIXX Shop.`;
    return {
      title,
      description,
      alternates: {
        canonical: buildProductHref({ slug: product.slug }),
      },
      openGraph: {
        title,
        description,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch {
    return {
      title: 'Sản phẩm',
      description: 'Thông tin chi tiết sản phẩm tại VNMIXX Shop.',
      alternates: {
        canonical: '/products',
      },
    };
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
  const { slug: routeKey } = await props.params;
  const searchParams = await props.searchParams;
  const productSlug = parseProductRouteKey(routeKey);
  if (!productSlug) {
    notFound();
  }
  try {
    const product = await serverApi.get<ShopProductDetail>(`/products/slug/${productSlug}`, {
      skipAuth: true,
    });
    const canonicalPath = buildProductHref({ slug: product.slug });
    if (routeKey !== canonicalPath.replace('/products/', '')) {
      redirect(canonicalPath);
    }
    const [initialPublicReviews, suggestedProducts] = await Promise.all([
      serverApi
        .get<ShopProductReviewsResult>(`/products/slug/${product.slug}/reviews?page=1&limit=10`, {
          skipAuth: true,
        })
        .catch((): ShopProductReviewsResult => emptyInitialReviews),
      fetchSuggestedProductsByCategory({
        categorySlug: product.category?.slug,
        excludedProductId: product.id,
      }).catch((): NewArrivalProduct[] => []),
    ]);
    const fromCategorySlugRaw = searchParams.fromCategorySlug;
    const fromCategoryNameRaw = searchParams.fromCategoryName;
    const fromCategorySlug =
      typeof fromCategorySlugRaw === 'string' ? fromCategorySlugRaw.trim() : '';
    const fromCategoryName =
      typeof fromCategoryNameRaw === 'string' ? fromCategoryNameRaw.trim() : '';
    const breadcrumbCategory =
      fromCategorySlug && fromCategoryName
        ? { slug: fromCategorySlug, name: fromCategoryName }
        : null;
    return (
      <ProductDetailPageContent
        product={product}
        initialPublicReviews={initialPublicReviews}
        suggestedProducts={suggestedProducts}
        breadcrumbCategory={breadcrumbCategory}
      />
    );
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
