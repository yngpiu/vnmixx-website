import { COOKIE_ACCESS_TOKEN, SHOP_SITE_URL } from '@/config/constants';
import { AuthProvider } from '@/modules/auth/providers/auth-provider';
import { LazyGlobalOverlays } from '@/modules/common/components/lazy-global-overlays';
import { ShopFooter } from '@/modules/footer/components/shop-footer';
import { ShopHeader } from '@/modules/header/components/shop-header';
import { QueryProvider } from '@/providers/query-provider';
import '@/styles/globals.css';
import { montserrat } from '@repo/ui/lib/fonts';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  metadataBase: new URL(SHOP_SITE_URL),
  title: {
    default: 'VNMIXX Shop',
    template: '%s | VNMIXX Shop',
  },
  description: 'VNMIXX Shop - thời trang hiện đại, tối giản và linh hoạt cho mỗi ngày.',
  openGraph: {
    type: 'website',
    siteName: 'VNMIXX Shop',
    title: 'VNMIXX Shop',
    description: 'Khám phá sản phẩm thời trang mới nhất tại VNMIXX Shop.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VNMIXX Shop',
    description: 'Khám phá sản phẩm thời trang mới nhất tại VNMIXX Shop.',
  },
  icons: {
    icon: [
      { url: '/images/favicon-light.png', media: '(prefers-color-scheme: light)' },
      { url: '/images/favicon-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value ?? null;
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${montserrat.className} min-h-dvh flex flex-col`}>
        <QueryProvider>
          <AuthProvider accessToken={accessToken}>
            <ShopHeader />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <ShopFooter />
            <LazyGlobalOverlays />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
