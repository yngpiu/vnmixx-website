import { ProductCategoryPage } from '@/modules/products/components/product-category-page';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Tất cả sản phẩm',
  description: 'Danh sách tất cả sản phẩm thời trang tại VNMIXX Shop.',
  alternates: {
    canonical: '/san-pham',
  },
};

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string | string[];
    search?: string | string[];
  }>;
}

function resolveSearchValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.find((item) => item.trim().length > 0)?.trim() ?? '';
  }
  return '';
}

export default async function ProductsPage(props: ProductsPageProps): Promise<React.JSX.Element> {
  const searchParams = await props.searchParams;
  const searchKeyword =
    resolveSearchValue(searchParams.q) || resolveSearchValue(searchParams.search);
  if (searchKeyword) {
    const nextParams = new URLSearchParams({ q: searchKeyword });
    redirect(`/tim-kiem?${nextParams.toString()}`);
  }
  return (
    <ProductCategoryPage categorySlug="" categoryName="Tất cả sản phẩm" breadcrumbCategories={[]} />
  );
}
