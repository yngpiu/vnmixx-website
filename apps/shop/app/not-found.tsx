import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  description: 'Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound(): React.JSX.Element {
  return (
    <main className="shop-shell-container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Không tìm thấy trang</h1>
      <p className="max-w-lg text-sm text-muted-foreground md:text-base">
        Liên kết có thể đã thay đổi hoặc trang không còn tồn tại.
      </p>
      <Link href="/" className="text-foreground underline underline-offset-4 hover:no-underline">
        Quay về trang chủ
      </Link>
    </main>
  );
}
