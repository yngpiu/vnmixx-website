import { EditProductForm } from '@/app/products/[id]/edit/edit-product-form';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Chỉnh sửa sản phẩm' };

type ProductsEditPageProps = {
  params: Promise<{ id: string }>;
};

function EditProductSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-8 pb-16 xl:max-w-[1360px]">
      <div className="flex flex-col gap-4 border-b pb-8 sm:flex-row sm:justify-between">
        <div className="space-y-3">
          <div className="h-8 w-40 rounded-md bg-muted" />
          <div className="h-10 w-64 max-w-full rounded-md bg-muted" />
          <div className="h-4 w-full max-w-xl rounded-md bg-muted" />
        </div>
      </div>
      <div className="grid gap-8 xl:grid-cols-12">
        <div className="space-y-8 xl:col-span-8">
          <div className="h-72 rounded-2xl border bg-muted/20" />
          <div className="h-72 rounded-2xl border bg-muted/20" />
        </div>
      </div>
    </div>
  );
}

export default async function ProductsEditPage({ params }: ProductsEditPageProps) {
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
      <Suspense fallback={<EditProductSkeleton />}>
        <EditProductForm productId={productId} />
      </Suspense>
    </div>
  );
}
