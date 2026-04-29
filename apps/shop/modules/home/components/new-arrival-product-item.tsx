import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import Link from 'next/link';

type NewArrivalProductItemProps = {
  categorySlug: string;
  product: NewArrivalProduct;
};

const moneyFormatter = new Intl.NumberFormat('vi-VN');

function formatMoney(value: number | null): string {
  if (value === null) {
    return 'Liên hệ';
  }
  return `${moneyFormatter.format(value)}đ`;
}

export function NewArrivalProductItem({
  categorySlug,
  product,
}: NewArrivalProductItemProps): React.JSX.Element {
  const currentPrice = product.minPrice;
  const oldPrice = product.maxPrice;
  const hasDiscountPrice = currentPrice !== null && oldPrice !== null && oldPrice > currentPrice;
  const productHref = `/danh-muc/${product.category?.slug ?? categorySlug}`;

  return (
    <article className="group">
      <Link href={productHref} className="block">
        <div className="overflow-hidden bg-muted/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.thumbnail ?? '/images/placeholder.jpg'}
            alt={product.name}
            className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="mt-3">
        <Link href={productHref} className="block">
          <h3 className="line-clamp-2 min-h-10 text-sm text-foreground">{product.name}</h3>
        </Link>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">{formatMoney(currentPrice)}</span>
          {hasDiscountPrice ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatMoney(oldPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
