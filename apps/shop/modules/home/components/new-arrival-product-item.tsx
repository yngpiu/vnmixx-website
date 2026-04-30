'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { getProductVariantMatrixBySlug } from '@/modules/cart/api/cart';
import { useAddCartItemMutation } from '@/modules/cart/hooks/use-cart';
import type { ProductVariantOption } from '@/modules/cart/types/cart';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import { ProductWishlistHeartButton } from '@/modules/wishlist/components/product-wishlist-heart-button';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { toast } from '@repo/ui/components/ui/sonner';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type NewArrivalProductItemProps = {
  product: NewArrivalProduct;
  /** Category listing typography; defaults to homepage card. */
  display?: 'compact' | 'listing';
};

const moneyFormatter = new Intl.NumberFormat('vi-VN');

function formatMoney(value: number | null): string {
  if (value === null) {
    return 'Liên hệ';
  }
  return `${moneyFormatter.format(value)}đ`;
}

export function NewArrivalProductItem({
  product,
  display = 'compact',
}: NewArrivalProductItemProps): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const addCartItemMutation = useAddCartItemMutation();
  const productPrice = product.minPrice ?? product.maxPrice;
  const productHref = `/san-pham/${product.slug}`;
  const productColorHexCodes = useMemo(
    () => (product.colorHexCodes.length > 0 ? product.colorHexCodes : ['#111111']),
    [product.colorHexCodes],
  );
  const [isPickerOpen, setPickerOpen] = useState<boolean>(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColorHexCode, setSelectedColorHexCode] = useState<string>(
    productColorHexCodes[0] ?? '#111111',
  );
  const productVariantsQuery = useQuery({
    queryKey: ['shop', 'products', product.slug, 'variants'],
    queryFn: () => getProductVariantMatrixBySlug(product.slug),
    enabled: isPickerOpen,
    staleTime: 1000 * 60 * 5,
  });
  const availableVariants = useMemo(
    () => productVariantsQuery.data?.variants ?? [],
    [productVariantsQuery.data?.variants],
  );
  const availableColorOptions = useMemo(() => {
    const sourceVariants = availableVariants.length > 0 ? availableVariants : [];
    if (sourceVariants.length === 0) {
      return productColorHexCodes.map((hexCode) => ({
        name: 'Màu tùy chọn',
        hexCode,
      }));
    }
    return sourceVariants.reduce<{ name: string; hexCode: string }[]>((result, variant) => {
      const hasExisting = result.some((item) => item.hexCode === variant.color.hexCode);
      if (!hasExisting) {
        result.push({ name: variant.color.name, hexCode: variant.color.hexCode });
      }
      return result;
    }, []);
  }, [availableVariants, productColorHexCodes]);
  const selectedVariantByColor = useMemo(
    () => availableVariants.filter((variant) => variant.color.hexCode === selectedColorHexCode),
    [availableVariants, selectedColorHexCode],
  );
  const sizeOptions = useMemo(
    () => [...new Set(selectedVariantByColor.map((variant) => variant.size.label))],
    [selectedVariantByColor],
  );
  const selectedVariant = useMemo<ProductVariantOption | null>(
    () =>
      selectedVariantByColor.find((variant) => variant.size.label === selectedSize) ??
      selectedVariantByColor[0] ??
      null,
    [selectedSize, selectedVariantByColor],
  );
  const openVariantPicker = (): void => {
    if (!isAuthSessionReady) {
      return;
    }
    if (!user) {
      toast.error('Bạn cần đăng nhập để thêm vào giỏ hàng', {
        position: 'bottom-right',
      });
      router.push('/login');
      return;
    }
    setSelectedColorHexCode(productColorHexCodes[0] ?? '#111111');
    setSelectedSize('');
    setPickerOpen(true);
  };
  const handleAddToCart = async (): Promise<void> => {
    if (!selectedVariant) {
      toast.error('Không tìm thấy biến thể phù hợp.', { position: 'bottom-right' });
      return;
    }
    try {
      await addCartItemMutation.mutateAsync({
        variantId: selectedVariant.id,
        quantity: 1,
      });
      setPickerOpen(false);
      toast.success('Đã thêm sản phẩm vào giỏ hàng', { position: 'bottom-right' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng.', {
        position: 'bottom-right',
      });
    }
  };

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
            {productColorHexCodes.map((hexCode, index: number) => (
              <span
                key={`${product.id}-${hexCode}-${index}`}
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: hexCode }}
                aria-hidden
              />
            ))}
          </div>
          <ProductWishlistHeartButton productId={product.id} layout="card" />
        </div>
        <Link href={productHref} className="block">
          <h3
            className={
              display === 'listing'
                ? 'line-clamp-2 min-h-10 text-sm leading-snug text-foreground md:text-[15px]'
                : 'line-clamp-2 min-h-10 text-sm text-foreground'
            }
          >
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between gap-3">
          <span
            className={`font-semibold text-foreground ${display === 'listing' ? 'text-[15px] md:text-base' : 'text-base'}`}
          >
            {formatMoney(productPrice)}
          </span>
          <PrimaryCtaButton
            ctaVariant="filled"
            isIconOnly
            aria-label="Chọn màu và kích cỡ để thêm giỏ hàng"
            onClick={openVariantPicker}
          >
            <ShoppingBag className="h-2 w-4" />
          </PrimaryCtaButton>
        </div>
      </div>
      <Dialog open={isPickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Chọn màu và kích cỡ</DialogTitle>
            <DialogDescription>{product.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Màu sắc</p>
              <div className="flex flex-wrap items-center gap-2">
                {availableColorOptions.map((color) => {
                  const isSelected = selectedColorHexCode === color.hexCode;
                  return (
                    <button
                      key={`${product.id}-${color.hexCode}`}
                      type="button"
                      aria-label={`Chọn màu ${color.name}`}
                      onClick={() => {
                        setSelectedColorHexCode(color.hexCode);
                        setSelectedSize('');
                      }}
                      className={`h-8 w-8 rounded-full border-2 transition ${isSelected ? 'border-foreground' : 'border-border'}`}
                      style={{ backgroundColor: color.hexCode }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Kích cỡ</p>
              <div className="grid grid-cols-4 gap-2">
                {sizeOptions.map((size: string) => {
                  const isSelected = selectedSize === size;
                  return (
                    <Button
                      key={`${product.id}-${size}`}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </Button>
                  );
                })}
              </div>
            </div>
            {productVariantsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải biến thể...</p>
            ) : null}
            {productVariantsQuery.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {productVariantsQuery.error instanceof Error
                  ? productVariantsQuery.error.message
                  : 'Không tải được biến thể sản phẩm.'}
              </p>
            ) : null}
            <PrimaryCtaButton
              type="button"
              onClick={() => void handleAddToCart()}
              disabled={
                !selectedVariant || addCartItemMutation.isPending || productVariantsQuery.isLoading
              }
            >
              Thêm vào giỏ hàng
            </PrimaryCtaButton>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
