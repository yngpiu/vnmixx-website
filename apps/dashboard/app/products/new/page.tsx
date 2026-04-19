import { NewProductForm } from '@/app/products/new/new-product-form';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Thêm mới sản phẩm' };

function NewProductSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-8 pb-16 xl:max-w-[1360px]">
      <div className="flex flex-col gap-4 border-b pb-8 sm:flex-row sm:justify-between">
        <div className="space-y-3">
          <div className="h-8 w-40 rounded-md bg-muted" />
          <div className="h-10 w-64 max-w-full rounded-md bg-muted" />
          <div className="h-4 w-full max-w-xl rounded-md bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 rounded-md bg-muted" />
          <div className="h-10 w-32 rounded-md bg-muted" />
        </div>
      </div>
      <div className="grid gap-8 xl:grid-cols-12">
        <div className="space-y-8 xl:col-span-8">
          <div className="h-72 rounded-2xl border bg-muted/20" />
          <div className="h-40 rounded-2xl border bg-muted/20" />
          <div className="h-56 rounded-2xl border bg-muted/20" />
        </div>
        <div className="h-96 rounded-2xl border bg-muted/20 xl:col-span-4" />
      </div>
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
