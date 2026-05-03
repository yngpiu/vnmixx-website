import { ProductCategoryPage } from '@/modules/products/components/product-category-page';
import type { Metadata } from 'next';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string | string[];
  }>;
}

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Tìm kiếm sản phẩm',
  description: 'Kết quả tìm kiếm sản phẩm thời trang tại VNMIXX Shop.',
  alternates: {
    canonical: '/tim-kiem',
  },
};

function resolveSearchKeyword(value: string | string[] | undefined): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.find((item) => item.trim().length > 0)?.trim() ?? '';
  }
  return '';
}

export default async function SearchPage(props: SearchPageProps): Promise<React.JSX.Element> {
  const searchParams = await props.searchParams;
  const keyword = resolveSearchKeyword(searchParams.q);
  const categoryName = keyword ? `Kết quả tìm kiếm theo '${keyword}'` : 'Kết quả tìm kiếm';
  return (
    <ProductCategoryPage categorySlug="" categoryName={categoryName} breadcrumbCategories={[]} />
  );
}
