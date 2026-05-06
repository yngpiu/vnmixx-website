'use client';

import { fetchTrendingSearchKeywords } from '@/modules/products/api/catalog';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@repo/ui/components/ui/input';
import { SearchIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const headerSearchSchema = z.object({
  query: z.string().max(200, { message: 'Từ khóa tìm kiếm quá dài.' }),
});

type HeaderSearchValues = z.infer<typeof headerSearchSchema>;
const RECENT_SEARCH_STORAGE_KEY = 'shop:recent-searches';
const RECENT_SEARCH_LIMIT = 6;
const DEFAULT_POPULAR_SEARCHES: string[] = ['Outlet'];

export function HeaderSearch(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLFormElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const shouldSkipNextFocusOpenRef = useRef<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>(DEFAULT_POPULAR_SEARCHES);
  const appliedSearch = useMemo(
    () => searchParams.get('q')?.trim() ?? searchParams.get('search')?.trim() ?? '',
    [searchParams],
  );
  const form = useForm<HeaderSearchValues>({
    resolver: zodResolver(headerSearchSchema),
    defaultValues: { query: appliedSearch },
  });
  const { register, handleSubmit, reset } = form;
  const queryField = register('query');
  useEffect(() => {
    reset({ query: appliedSearch });
  }, [appliedSearch, reset]);
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
  useEffect(() => {
    const handleDocumentPointerDown = (event: MouseEvent): void => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) {
        return;
      }
      if (!containerRef.current?.contains(eventTarget)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentPointerDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown);
    };
  }, []);
  const executeSearch = (rawSearch: string): void => {
    const normalizedSearch = rawSearch.trim();
    if (!normalizedSearch) {
      return;
    }
    const dedupedSearches = recentSearches.filter(
      (existingSearch) => existingSearch.toLowerCase() !== normalizedSearch.toLowerCase(),
    );
    const nextRecentSearches = [normalizedSearch, ...dedupedSearches].slice(0, RECENT_SEARCH_LIMIT);
    setRecentSearches(nextRecentSearches);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(nextRecentSearches));
    }
    setIsDropdownOpen(false);
    const nextParams = new URLSearchParams();
    nextParams.set('q', normalizedSearch);
    const queryString = nextParams.toString();
    router.push(`/search?${queryString}`);
  };
  const submitSearch = (values: HeaderSearchValues): void => {
    const normalizedSearch = values.query.trim();
    if (!normalizedSearch) {
      return;
    }
    executeSearch(normalizedSearch);
  };
  return (
    <form
      ref={containerRef}
      className="relative w-full max-w-[220px] lg:max-w-[250px] xl:max-w-[300px]"
      onSubmit={handleSubmit(submitSearch)}
    >
      <SearchIcon className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 stroke-[1.75]" />
      <Input
        type="search"
        {...queryField}
        ref={(element) => {
          queryField.ref(element);
          searchInputRef.current = element;
        }}
        placeholder="Tìm kiếm sản phẩm"
        className="h-9 rounded-none border border-border/70 bg-background pl-9 text-sm shadow-none placeholder:text-xs placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-input"
        aria-label="Tìm kiếm sản phẩm"
        onMouseDown={() => {
          if (!isDropdownOpen) {
            if (searchInputRef.current && document.activeElement === searchInputRef.current) {
              setIsDropdownOpen(true);
            }
            return;
          }
          shouldSkipNextFocusOpenRef.current = true;
          setIsDropdownOpen(false);
        }}
        onFocus={() => {
          if (shouldSkipNextFocusOpenRef.current) {
            shouldSkipNextFocusOpenRef.current = false;
            return;
          }
          setIsDropdownOpen(true);
        }}
      />
      {isDropdownOpen ? (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-[360px] rounded-sm border border-border/80 bg-popover p-4 shadow-md">
          <section>
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
        </div>
      ) : null}
    </form>
  );
}
