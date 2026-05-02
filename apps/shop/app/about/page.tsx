import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Về chúng tôi',
  description:
    'Tìm hiểu về VNMIXX, thương hiệu thời trang theo đuổi phong cách hiện đại, tối giản và linh hoạt.',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutPage(): React.JSX.Element {
  return (
    <main className="shop-shell-container pb-16 pt-10">
      <section className="max-w-3xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Về VNMIXX</h1>
        <p className="text-base leading-7 text-muted-foreground">
          VNMIXX là thương hiệu thời trang với định hướng hiện đại, tối giản và linh hoạt trong đời
          sống hằng ngày.
        </p>
        <p className="text-base leading-7 text-muted-foreground">
          Trang này đang là phiên bản khởi tạo để hoàn thiện điều hướng từ menu header.
        </p>
      </section>
    </main>
  );
}
