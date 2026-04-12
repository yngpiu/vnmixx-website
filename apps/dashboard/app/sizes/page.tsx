import { SizesView } from '@/app/sizes/sizes-view';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Kích cỡ · Vnmixx' };

function SizesViewSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex flex-wrap justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded-md bg-muted" />
          <div className="h-4 w-full max-w-md rounded-md bg-muted" />
        </div>
        <div className="h-9 w-36 rounded-md bg-muted" />
      </div>
      <div className="h-9 w-full max-w-md rounded-md bg-muted/80" />
      <div className="h-72 w-full rounded-xl border bg-muted/25" />
    </div>
  );
}

export default function SizesListPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <Suspense fallback={<SizesViewSkeleton />}>
        <SizesView />
      </Suspense>
    </div>
  );
}
