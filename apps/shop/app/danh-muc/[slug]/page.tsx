import { serverApi } from '@/lib/server-api';
import { ProductCategoryPage } from '@/modules/products/components/product-category-page';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

type CategoryBrief = {
  id: number;
  name: string;
  slug: string;
};

type CategoryPayload = CategoryBrief & {
  parent: CategoryBrief | null;
  children: unknown[];
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps): Promise<{ title: string }> {
  const { slug } = await props.params;
  try {
    const category = await serverApi.get<CategoryPayload>(`/categories/${slug}`, {
      skipAuth: true,
    });
    return { title: `${category.name} | VNMIXX Shop` };
  } catch {
    return { title: 'Danh mục | VNMIXX Shop' };
  }
}

export default async function CategoryListingPage(props: PageProps): Promise<React.JSX.Element> {
  const { slug } = await props.params;
  try {
    const category = await serverApi.get<CategoryPayload>(`/categories/${slug}`, {
      skipAuth: true,
    });
    return (
      <Suspense fallback={<CategoryPageFallback />}>
        <ProductCategoryPage
          categorySlug={category.slug}
          categoryName={category.name}
          parentCategory={category.parent}
        />
      </Suspense>
    );
  } catch {
    notFound();
  }
}

function CategoryPageFallback(): React.JSX.Element {
  return (
    <main className="shop-shell-container pb-16 pt-6 md:pt-8">
      <Skeleton className="mb-8 h-5 w-full max-w-xl" />
      <div className="flex flex-col gap-8 lg:flex-row">
        <Skeleton className="h-[420px] w-full lg:w-[260px]" />
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-3/4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
