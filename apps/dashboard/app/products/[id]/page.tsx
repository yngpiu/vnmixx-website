import { ProductDetailView } from '@/app/products/[id]/product-detail-view';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Chi tiết sản phẩm' };

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-8 pb-16 xl:max-w-[1360px]">
      <div className="h-24 rounded-2xl border bg-muted/20" />
      <div className="h-80 rounded-2xl border bg-muted/20" />
      <div className="h-80 rounded-2xl border bg-muted/20" />
    </div>
  );
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const productId = Number.parseInt(id, 10);
  if (!Number.isFinite(productId) || productId <= 0) {
    return (
      <div className="p-4 text-sm text-destructive" role="alert">
        ID sản phẩm không hợp lệ.
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailView productId={productId} />
      </Suspense>
    </div>
  );
}
