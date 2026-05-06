import { API_BASE_URL, SHOP_SITE_URL } from '@/config/constants';
import { buildCategoryHref, buildProductHref } from '@/modules/common/utils/shop-routes';
import type { MetadataRoute } from 'next';

type PaginatedProductsEnvelope = {
  success: boolean;
  data: Array<{ slug: string }>;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CategoriesEnvelope = {
  success: boolean;
  data: Array<{ slug: string; isActive?: boolean }>;
};

const PRODUCTS_PAGE_LIMIT = 200;
const PRODUCTS_MAX_PAGES = 50;

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchActiveCategories(): Promise<Array<{ slug: string }>> {
  const payload = await safeFetchJson<CategoriesEnvelope>(`${API_BASE_URL}/categories`);
  if (!payload || !payload.success) {
    return [];
  }
  return payload.data
    .filter((item) => item.isActive !== false && Boolean(item.slug))
    .map((item) => ({ slug: item.slug }));
}

async function fetchAllProducts(): Promise<Array<{ slug: string }>> {
  const products: Array<{ slug: string }> = [];
  let currentPage = 1;
  let totalPages = 1;
  while (currentPage <= totalPages && currentPage <= PRODUCTS_MAX_PAGES) {
    const searchParams = new URLSearchParams({
      page: String(currentPage),
      limit: String(PRODUCTS_PAGE_LIMIT),
      sort: 'newest',
    });
    const payload = await safeFetchJson<PaginatedProductsEnvelope>(
      `${API_BASE_URL}/products?${searchParams.toString()}`,
    );
    if (!payload || !payload.success) {
      break;
    }
    for (const product of payload.data ?? []) {
      if (product.slug) {
        products.push({ slug: product.slug });
      }
    }
    totalPages = payload.meta?.totalPages ?? 1;
    currentPage += 1;
  }
  return products;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();
  const [categories, products] = await Promise.all([fetchActiveCategories(), fetchAllProducts()]);
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SHOP_SITE_URL}/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SHOP_SITE_URL}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SHOP_SITE_URL}/products`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SHOP_SITE_URL}${buildCategoryHref(category)}`,
    lastModified: currentDate,
    changeFrequency: 'daily',
    priority: 0.8,
  }));
  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SHOP_SITE_URL}${buildProductHref(product)}`,
    lastModified: currentDate,
    changeFrequency: 'daily',
    priority: 0.8,
  }));
  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
