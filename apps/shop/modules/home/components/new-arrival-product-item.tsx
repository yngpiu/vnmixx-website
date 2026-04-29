'use client';

import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import { Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

type NewArrivalProductItemProps = {
  product: NewArrivalProduct;
};

const moneyFormatter = new Intl.NumberFormat('vi-VN');

function formatMoney(value: number | null): string {
  if (value === null) {
    return 'Liên hệ';
  }
  return `${moneyFormatter.format(value)}đ`;
}

export function NewArrivalProductItem({ product }: NewArrivalProductItemProps): React.JSX.Element {
  const productPrice = product.minPrice ?? product.maxPrice;
  const productHref = `/san-pham/${product.slug}`;
  const colorHexCodes = product.colorHexCodes ?? [];

  return (
    <article className="group">
      <Link href={productHref} className="block">
        <div className="overflow-hidden bg-muted/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.thumbnail ?? '/images/placeholder.jpg'}
            alt={product.name}
            className="aspect-3/4 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {colorHexCodes.map((colorHexCode: string, index: number) => (
              <span
                key={`${product.id}-${colorHexCode}-${index}`}
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: colorHexCode }}
                aria-hidden
              />
            ))}
          </div>
          <button
            type="button"
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Yêu thích (chưa triển khai)"
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>
        <Link href={productHref} className="block">
          <h3 className="line-clamp-2 min-h-10 text-sm  text-foreground">{product.name}</h3>
        </Link>
        <div className=" flex items-center justify-between gap-3">
          <span className="text-base font-semibold text-foreground ">
            {formatMoney(productPrice)}
          </span>
          <PrimaryCtaButton
            ctaVariant="filled"
            isIconOnly
            aria-label="Thêm vào giỏ hàng (chưa triển khai)"
          >
            <ShoppingBag className="h-2 w-4" />
          </PrimaryCtaButton>
        </div>
      </div>
    </article>
  );
}
