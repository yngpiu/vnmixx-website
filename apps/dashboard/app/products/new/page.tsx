import { NewProductForm } from '@/app/products/new/new-product-form';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Thêm mới · Sản phẩm · Vnmixx' };

function NewProductSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6 pb-12">
      <div className="h-8 w-32 rounded-md bg-muted" />
      <div className="h-10 w-2/3 max-w-md rounded-md bg-muted" />
      <div className="h-64 rounded-xl border bg-muted/25" />
      <div className="h-48 rounded-xl border bg-muted/25" />
    </div>
  );
}

export default function ProductsNewPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <Suspense fallback={<NewProductSkeleton />}>
        <NewProductForm />
      </Suspense>
    </div>
  );
}
