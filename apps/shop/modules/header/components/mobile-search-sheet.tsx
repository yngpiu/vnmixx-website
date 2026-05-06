'use client';

import { fetchTrendingSearchKeywords } from '@/modules/products/api/catalog';
import { Input } from '@repo/ui/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@repo/ui/components/ui/sheet';
import { SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

const RECENT_SEARCH_STORAGE_KEY = 'shop:recent-searches';
const RECENT_SEARCH_LIMIT = 6;
const DEFAULT_POPULAR_SEARCHES: string[] = ['Outlet'];

interface MobileSearchSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function buildNextRecentSearches(params: {
  currentRecentSearches: string[];
  newSearch: string;
}): string[] {
  const normalizedSearch = params.newSearch.trim();
  if (!normalizedSearch) {
    return params.currentRecentSearches;
  }
  const dedupedSearches = params.currentRecentSearches.filter(
    (existingSearch) => existingSearch.toLowerCase() !== normalizedSearch.toLowerCase(),
  );
  return [normalizedSearch, ...dedupedSearches].slice(0, RECENT_SEARCH_LIMIT);
}

export function MobileSearchSheet({
  isOpen,
  onOpenChange,
}: MobileSearchSheetProps): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>(DEFAULT_POPULAR_SEARCHES);
  useEffect(() => {
    let isActive = true;
    const loadTrendingSearches = async (): Promise<void> => {
      try {
        const nextPopularSearches = await fetchTrendingSearchKeywords({ limit: 6 });
        if (!isActive || nextPopularSearches.length === 0) {
          return;
        }
        setPopularSearches(nextPopularSearches);
      } catch {
        if (!isActive) {
          return;
        }
        setPopularSearches(DEFAULT_POPULAR_SEARCHES);
      }
    };
    void loadTrendingSearches();
    return () => {
      isActive = false;
    };
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const cachedSearches = window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
    if (!cachedSearches) {
      return;
    }
    try {
      const parsedSearches: unknown = JSON.parse(cachedSearches);
      if (!Array.isArray(parsedSearches)) {
        return;
      }
      const validSearches = parsedSearches.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );
      setRecentSearches(validSearches.slice(0, RECENT_SEARCH_LIMIT));
    } catch {
      window.localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
    }
  }, []);
  const executeSearch = (rawSearch: string): void => {
    const normalizedSearch = rawSearch.trim();
    if (!normalizedSearch) {
      return;
    }
    const nextRecentSearches = buildNextRecentSearches({
      currentRecentSearches: recentSearches,
      newSearch: normalizedSearch,
    });
    setRecentSearches(nextRecentSearches);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(nextRecentSearches));
    }
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(normalizedSearch)}`);
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    executeSearch(query);
  };
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bottom-16 h-[calc(100svh-4rem)] overflow-y-auto rounded-none p-2 md:hidden"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">Tìm kiếm sản phẩm</SheetTitle>
        <div className="bg-background p-4">
          <form className="relative" onSubmit={handleSubmit}>
            <SearchIcon className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 stroke-[1.75]" />
            <Input
              type="search"
              placeholder="Tìm kiếm sản phẩm..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 rounded-none border border-border/70 bg-background pl-10 text-sm shadow-none placeholder:text-xs placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-input"
              aria-label="Tìm kiếm sản phẩm"
            />
          </form>
          <section className="mt-6">
            <h3 className="text-[14px] leading-4 font-semibold text-foreground">
              Tìm kiếm nhiều nhất
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {popularSearches.length > 0 ? (
                popularSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="border border-border/80 px-3 py-2 text-[14px] leading-4 text-muted-foreground"
                    onClick={() => executeSearch(item)}
                  >
                    {item}
                  </button>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Chưa có từ khóa nào</span>
              )}
            </div>
          </section>
          <section className="mt-6">
            <h3 className="text-[14px] leading-4 font-semibold text-foreground">Vừa tìm kiếm</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentSearches.length > 0 ? (
                recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className=" border border-border/80 px-3 py-2 text-[14px] leading-4 text-muted-foreground"
                    onClick={() => executeSearch(item)}
                  >
                    {item}
                  </button>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Chưa có từ khóa nào</span>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
