import {
  ProductCardClient,
  type ProductCardProps,
} from '@/modules/common/components/product-card-client';

export type { ProductCardProps };

export function ProductCard(props: ProductCardProps): React.JSX.Element {
  return <ProductCardClient {...props} />;
}
