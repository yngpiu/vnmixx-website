'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

type CatalogFilterSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function CatalogFilterSection({
  title,
  defaultOpen = true,
  children,
}: CatalogFilterSectionProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  return (
    <div className="border-b border-border py-4 first:pt-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 py-0.5 text-left text-[11px] font-semibold tracking-wide text-foreground uppercase md:text-xs"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
      >
        {title}
        {open ? (
          <ChevronDown className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
        )}
      </button>
      {open ? <div className="mt-3 md:mt-4">{children}</div> : null}
    </div>
  );
}
