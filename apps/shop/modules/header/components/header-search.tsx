'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@repo/ui/components/ui/input';
import { SearchIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const headerSearchSchema = z.object({
  query: z.string().max(200, { message: 'Từ khóa tìm kiếm quá dài.' }),
});

type HeaderSearchValues = z.infer<typeof headerSearchSchema>;

export function HeaderSearch(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedSearch = useMemo(
    () => searchParams.get('q')?.trim() ?? searchParams.get('search')?.trim() ?? '',
    [searchParams],
  );
  const form = useForm<HeaderSearchValues>({
    resolver: zodResolver(headerSearchSchema),
    defaultValues: { query: appliedSearch },
  });
  const { register, handleSubmit, reset } = form;
  useEffect(() => {
    reset({ query: appliedSearch });
  }, [appliedSearch, reset]);
  const submitSearch = (values: HeaderSearchValues): void => {
    const normalizedSearch = values.query.trim();
    if (!normalizedSearch) {
      return;
    }
    const nextParams = new URLSearchParams();
    nextParams.set('q', normalizedSearch);
    const queryString = nextParams.toString();
    router.push(`/search?${queryString}`);
  };
  return (
    <form
      className="relative w-full max-w-[220px] lg:max-w-[250px] xl:max-w-[300px]"
      onSubmit={handleSubmit(submitSearch)}
    >
      <SearchIcon className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 stroke-[1.75]" />
      <Input
        type="search"
        {...register('query')}
        placeholder="Tìm kiếm sản phẩm"
        className="h-9 rounded-sm border border-border/60 bg-background pl-9 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-input"
        aria-label="Tìm kiếm sản phẩm"
      />
    </form>
  );
}
