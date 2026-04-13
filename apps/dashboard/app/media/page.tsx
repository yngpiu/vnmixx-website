import { Suspense } from 'react';
import { MediaLibrary } from './media-library';

function MediaLibrarySkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden animate-pulse sm:gap-3">
      <div className="h-8 w-48 shrink-0 rounded-md bg-muted" />
      <div className="min-h-0 flex-1 rounded-xl border bg-muted/25" />
    </div>
  );
}

export default function MediaPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
      <Suspense fallback={<MediaLibrarySkeleton />}>
        <MediaLibrary />
      </Suspense>
    </div>
  );
}
