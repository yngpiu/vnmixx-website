import { ProductCategoryPage } from '@/modules/products/components/product-category-page';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Tất cả sản phẩm',
  description: 'Danh sách tất cả sản phẩm thời trang tại VNMIXX Shop.',
  alternates: {
    canonical: '/san-pham',
  },
};

export default function ProductsPage(): React.JSX.Element {
  return (
    <ProductCategoryPage categorySlug="" categoryName="Tất cả sản phẩm" parentCategory={null} />
  );
}
