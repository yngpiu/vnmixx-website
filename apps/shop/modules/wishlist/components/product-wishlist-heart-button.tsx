'use client';

import {
  parseWishlistErrorMessage,
  useWishlistProductToggle,
} from '@/modules/wishlist/hooks/use-wishlist';
import { toast } from '@repo/ui/components/ui/sonner';
import { cn } from '@repo/ui/lib/utils';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ProductWishlistHeartButtonProps = {
  productId: number;
  layout: 'card' | 'detail';
};

export function ProductWishlistHeartButton({
  productId,
  layout,
}: ProductWishlistHeartButtonProps): React.JSX.Element {
  const router = useRouter();
  const { isFavorite, toggleFavorite, isPending, isAuthenticatedCustomer, isAuthSessionReady } =
    useWishlistProductToggle(productId);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthSessionReady) {
      return;
    }
    if (!isAuthenticatedCustomer) {
      toast.error('Bạn cần đăng nhập để thực hiện chức năng này', { position: 'bottom-right' });
      router.push('/login');
      return;
    }
    void (async () => {
      const wasFavorite = isFavorite;
      try {
        await toggleFavorite();
        toast.success(
          wasFavorite
            ? 'Đã bỏ sản phẩm này khỏi danh sách yêu thích'
            : 'Đã thêm sản phẩm này vào danh sách yêu thích',
          { position: 'bottom-right' },
        );
      } catch (error) {
        toast.error(parseWishlistErrorMessage(error), { position: 'bottom-right' });
      }
    })();
  };
  const iconClassName = cn(
    'transition-colors',
    layout === 'detail' ? 'h-9 w-9 md:h-11 md:w-11' : 'h-5 w-5',
    isFavorite
      ? 'fill-red-600 text-red-600'
      : layout === 'detail'
        ? 'fill-none text-foreground hover:text-red-500/90'
        : 'fill-none text-muted-foreground hover:text-foreground',
  );
  if (layout === 'detail') {
    return (
      <button
        type="button"
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center border-0 bg-transparent p-0',
          'text-foreground transition-opacity hover:opacity-80',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50 md:h-14 md:w-14',
        )}
        aria-label={isFavorite ? 'Bỏ khỏi sản phẩm yêu thích' : 'Thêm vào sản phẩm yêu thích'}
        aria-pressed={isFavorite}
        disabled={isPending}
        onClick={handleClick}
      >
        <Heart className={iconClassName} strokeWidth={1} aria-hidden />
      </button>
    );
  }
  return (
    <button
      type="button"
      className="transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
      aria-label={isFavorite ? 'Bỏ khỏi sản phẩm yêu thích' : 'Thêm vào sản phẩm yêu thích'}
      aria-pressed={isFavorite}
      disabled={isPending}
      onClick={handleClick}
    >
      <Heart className={iconClassName} strokeWidth={2} aria-hidden />
    </button>
  );
}
