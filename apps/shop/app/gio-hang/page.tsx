import { CartPageContent } from '@/modules/cart/components/cart-page-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage(): React.JSX.Element {
  return <CartPageContent />;
}
