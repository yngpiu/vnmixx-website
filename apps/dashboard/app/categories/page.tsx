import { CategoriesView } from '@/app/categories/categories-view';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Danh mục' };

function CategoriesViewSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-4 w-full max-w-xl rounded-md bg-muted" />
      </div>
      <div className="h-9 w-56 rounded-md bg-muted/80" />
      <div className="h-80 w-full rounded-xl border bg-muted/25" />
    </div>
  );
}

export default function CategoriesListPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <Suspense fallback={<CategoriesViewSkeleton />}>
        <CategoriesView />
      </Suspense>
    </div>
  );
}
