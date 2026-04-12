import { ProductsView } from '@/app/products/products-view';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Sản phẩm · Vnmixx' };

function ProductsViewSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex flex-wrap justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded-md bg-muted" />
          <div className="h-4 w-full max-w-xl rounded-md bg-muted" />
        </div>
        <div className="h-9 w-40 rounded-md bg-muted/80" />
      </div>
      <div className="h-9 w-full max-w-md rounded-md bg-muted/80" />
      <div className="h-80 w-full rounded-xl border bg-muted/25" />
    </div>
  );
}

export default function ProductsListPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <Suspense fallback={<ProductsViewSkeleton />}>
        <ProductsView />
      </Suspense>
    </div>
  );
}
