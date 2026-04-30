'use client';

import { Skeleton } from '@repo/ui/components/ui/skeleton';

type CatalogProductGridSkeletonProps = {
  count?: number;
};

export function CatalogProductGridSkeleton({
  count = 8,
}: CatalogProductGridSkeletonProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-3/4 w-full rounded-none" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
