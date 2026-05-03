'use client';

import { Input } from '@repo/ui/components/ui/input';
import { SearchIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export function HeaderSearch(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedSearch = useMemo(
    () => searchParams.get('q')?.trim() ?? searchParams.get('search')?.trim() ?? '',
    [searchParams],
  );
  const [searchInputValue, setSearchInputValue] = useState<string>(appliedSearch);
  useEffect(() => {
    setSearchInputValue(appliedSearch);
  }, [appliedSearch]);
  function submitSearch(): void {
    const nextParams = new URLSearchParams();
    const normalizedSearch = searchInputValue.trim();
    if (normalizedSearch) {
      nextParams.set('q', normalizedSearch);
    }
    const queryString = nextParams.toString();
    router.push(queryString ? `/tim-kiem?${queryString}` : '/tim-kiem');
  }
  return (
    <form
      className="relative w-full max-w-[220px] lg:max-w-[250px] xl:max-w-[300px]"
      onSubmit={(event) => {
        event.preventDefault();
        submitSearch();
      }}
    >
      <SearchIcon className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 stroke-[1.75]" />
      <Input
        type="search"
        value={searchInputValue}
        onChange={(event) => setSearchInputValue(event.target.value)}
        placeholder="Tìm kiếm sản phẩm"
        className="h-9 rounded-sm border border-border/60 bg-background pl-9 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-input"
        aria-label="Tìm kiếm sản phẩm"
      />
    </form>
  );
}
