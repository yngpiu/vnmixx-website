import { Injectable, Logger } from '@nestjs/common';
import { ProductService } from '../../product/services/product.service';
import type { SearchProductsArgs } from '../schemas/tool-args.schema';

const SHOP_BASE_URL = 'https://vnmixx.shop';
const MAX_PRODUCTS = 6;

export type ProductAiResult = {
  name: string;
  slug: string;
  minPrice: number | null;
  colors: string[];
  sizes: string[];
  link: string;
};

@Injectable()
export class CatalogAiSearchService {
  private readonly logger = new Logger(CatalogAiSearchService.name);

  constructor(private readonly productService: ProductService) {}

  async search(args: SearchProductsArgs): Promise<ProductAiResult[]> {
    const startedAt = Date.now();
    const query = args.query.trim();
    this.logger.log(`[catalog-ai] search start: query="${query}"`);
    const result = await this.productService.findPublicList({
      page: 1,
      limit: MAX_PRODUCTS,
      search: query || undefined,
      categorySlug: this.resolveCategorySlug(args.category),
      minPrice: args.minPrice,
      maxPrice: args.maxPrice,
      sort: 'relevance',
    });
    const mapped = result.data.map((p) => {
      const normalizedSlug = this.normalizeProductSlug(p.slug);
      const prices = p.variants.map((v) => v.price);
      const colors = [...new Set(p.variants.map((v) => v.color.name))];
      const sizes = [...new Set(p.variants.map((v) => v.size.label))];
      return {
        name: p.name,
        slug: normalizedSlug,
        minPrice: prices.length > 0 ? Math.min(...prices) : null,
        colors,
        sizes,
        link: `${SHOP_BASE_URL}/products/${normalizedSlug}`,
      };
    });
    const deduped = Array.from(
      new Map(mapped.map((product) => [product.slug, product] as const)).values(),
    );
    this.logger.log(
      `[catalog-ai] search done: source=product-service results=${deduped.length} duration=${Date.now() - startedAt}ms`,
    );
    return deduped;
  }

  private resolveCategorySlug(category: string | undefined): string | undefined {
    const normalized = category?.trim();
    if (!normalized) {
      return undefined;
    }
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : undefined;
  }

  private normalizeProductSlug(rawSlug: string): string {
    const normalized = rawSlug.trim().replace(/^\/+|\/+$/g, '');
    const leafSlug = normalized.split('/').filter(Boolean).at(-1) ?? normalized;
    return leafSlug || rawSlug;
  }
}
