import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Settings } from 'meilisearch';
import { MeilisearchService } from '../../meilisearch/services/meilisearch.service';
import {
  ProductRepository,
  type ProductSearchDocument as ProductSearchSourceDocument,
} from '../repositories/product.repository';

const SEARCH_FETCH_BATCH = 80;
const SEARCH_FETCH_LIMIT = 240;

type ProductSearchDocument = {
  id: number;
  slug: string;
  name: string;
  nameNormalized: string;
  description: string | null;
  descriptionNormalized: string;
  primaryCategoryName: string | null;
  primaryCategorySlug: string | null;
  primaryCategoryNameNormalized: string;
  categoryPathSlugs: string[];
  categorySearchText: string;
  categorySearchTextNormalized: string;
  colorNames: string[];
  colorNamesNormalized: string[];
  sizeLabels: string[];
  searchTextNormalized: string;
  minPrice: number | null;
  maxPrice: number | null;
  activeVariantCount: number;
  totalOnHand: number;
  inStock: boolean;
  createdAtTs: number;
};

type SearchProductIdsParams = {
  query?: string;
  categorySlug?: string;
  colorNames?: string[];
  sizeLabels?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc';
};

@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);
  private isIndexReady = false;

  constructor(
    @Inject(MeilisearchService) private readonly meilisearchService: MeilisearchService,
    @Inject(ProductRepository) private readonly productRepository: ProductRepository,
  ) {}

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  private joinAndNormalize(values: ReadonlyArray<string>): string {
    return this.normalizeSearchText(values.join(' '));
  }

  private mapToSearchDocument(document: ProductSearchSourceDocument): ProductSearchDocument {
    const descriptionNormalized = this.normalizeSearchText(document.description ?? '');
    const primaryCategoryNameNormalized = this.normalizeSearchText(
      document.primaryCategoryName ?? '',
    );
    const categorySearchTextNormalized = this.normalizeSearchText(document.categorySearchText);
    const colorNamesNormalized = document.colorNames
      .map((value) => this.normalizeSearchText(value))
      .filter((value) => value.length > 0);
    const searchTextNormalized = this.joinAndNormalize([
      document.name,
      document.slug,
      document.description ?? '',
      document.primaryCategoryName ?? '',
      document.categorySearchText,
      ...document.categoryPathSlugs,
      ...document.colorNames,
      ...document.sizeLabels,
    ]);
    return {
      ...document,
      nameNormalized: this.normalizeSearchText(document.name),
      descriptionNormalized,
      primaryCategoryNameNormalized,
      categorySearchTextNormalized,
      colorNamesNormalized,
      searchTextNormalized,
    };
  }

  private tokenizeSearchText(value: string): string[] {
    return value.split(' ').filter((token) => token.length > 0);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private countPrefixTokenMatches(params: { nameNormalized: string; tokens: string[] }): number {
    let count = 0;
    for (const token of params.tokens) {
      const pattern = new RegExp(`(?:^|\\s)${this.escapeRegex(token)}`, 'i');
      if (pattern.test(params.nameNormalized)) {
        count += 1;
      }
    }
    return count;
  }

  private scoreSearchHit(params: {
    queryNormalized: string;
    queryTokens: string[];
    nameNormalized: string;
    descriptionNormalized: string;
    primaryCategoryNameNormalized: string;
    categorySearchTextNormalized: string;
    colorNamesNormalized: string[];
    searchTextNormalized: string;
    baseRank: number;
  }): number {
    const name = params.nameNormalized ?? '';
    const desc = params.descriptionNormalized ?? '';
    const catName = params.primaryCategoryNameNormalized ?? '';
    const catSearch = params.categorySearchTextNormalized ?? '';
    const colors = params.colorNamesNormalized ?? [];
    const searchText = params.searchTextNormalized ?? '';
    const query = params.queryNormalized;
    const tokens = params.queryTokens;

    const startsWithQuery = name.startsWith(query);
    const containsWholeQuery = name.includes(query);
    const hasAllTokens = tokens.every((token) => name.includes(token));
    const descriptionHasAllTokens = tokens.every((token) => desc.includes(token));
    const categoryStartsWithQuery = catName.startsWith(query);
    const categoryContainsQuery = catName.includes(query) || catSearch.includes(query);
    const colorsContainQuery = colors.some((value) => value.includes(query));
    const searchTextHasAllTokens = tokens.every((token) => searchText.includes(token));
    const prefixTokenMatches = this.countPrefixTokenMatches({
      nameNormalized: name,
      tokens,
    });
    const categoryPrefixMatches = this.countPrefixTokenMatches({
      nameNormalized: catSearch,
      tokens,
    });
    return (
      (startsWithQuery ? 1000 : 0) +
      (containsWholeQuery ? 300 : 0) +
      (hasAllTokens ? 200 : 0) +
      (categoryStartsWithQuery ? 180 : 0) +
      (categoryContainsQuery ? 120 : 0) +
      (searchTextHasAllTokens ? 100 : 0) +
      (descriptionHasAllTokens ? 80 : 0) +
      (colorsContainQuery ? 60 : 0) +
      prefixTokenMatches * 25 +
      categoryPrefixMatches * 15 -
      params.baseRank * 0.001
    );
  }

  async ensureProductIndex(): Promise<void> {
    if (!this.meilisearchService.isEnabled()) {
      return;
    }
    if (this.isIndexReady) {
      return;
    }
    const client = this.meilisearchService.getClient();
    const indexUid = this.meilisearchService.getProductIndexUid();
    await client.createIndex(indexUid, { primaryKey: 'id' }).catch(() => undefined);
    const settings: Settings = {
      searchableAttributes: [
        'name',
        'nameNormalized',
        'primaryCategoryName',
        'primaryCategoryNameNormalized',
        'categorySearchText',
        'categorySearchTextNormalized',
        'slug',
        'description',
        'descriptionNormalized',
        'colorNames',
        'colorNamesNormalized',
        'sizeLabels',
        'searchTextNormalized',
      ],
      filterableAttributes: [
        'primaryCategorySlug',
        'categoryPathSlugs',
        'colorNames',
        'sizeLabels',
        'minPrice',
        'maxPrice',
        'inStock',
      ],
      sortableAttributes: ['id', 'minPrice', 'maxPrice', 'createdAtTs', 'totalOnHand'],
      displayedAttributes: [
        'id',
        'slug',
        'name',
        'nameNormalized',
        'description',
        'descriptionNormalized',
        'primaryCategoryName',
        'primaryCategorySlug',
        'primaryCategoryNameNormalized',
        'categoryPathSlugs',
        'categorySearchText',
        'categorySearchTextNormalized',
        'colorNames',
        'colorNamesNormalized',
        'sizeLabels',
        'searchTextNormalized',
        'minPrice',
        'maxPrice',
        'activeVariantCount',
        'totalOnHand',
        'inStock',
        'createdAtTs',
      ],
    };
    await client.index(indexUid).updateSettings(settings);
    this.isIndexReady = true;
  }

  async syncProductById(productId: number): Promise<void> {
    if (!this.meilisearchService.isEnabled()) {
      return;
    }
    await this.ensureProductIndex();
    const document = await this.productRepository.findProductSearchDocumentById(productId);
    const index = this.meilisearchService
      .getClient()
      .index(this.meilisearchService.getProductIndexUid());
    if (!document) {
      await index.deleteDocument(String(productId));
      return;
    }
    await index.addDocuments([this.mapToSearchDocument(document)]);
  }

  async reindexAllProducts(): Promise<void> {
    if (!this.meilisearchService.isEnabled()) {
      this.logger.warn('Skip product reindex because Meilisearch is disabled.');
      return;
    }
    await this.ensureProductIndex();
    const documents = (await this.productRepository.findAllProductSearchDocuments()).map(
      (document) => this.mapToSearchDocument(document),
    );
    const index = this.meilisearchService
      .getClient()
      .index(this.meilisearchService.getProductIndexUid());
    await index.deleteAllDocuments();
    if (documents.length > 0) {
      await index.addDocuments(documents);
    }
    this.isIndexReady = true;
    this.logger.log(`Reindexed ${documents.length} products to Meilisearch.`);
  }

  private buildSearchFilters(params: SearchProductIdsParams): string[] {
    const filters: string[] = [];
    if (params.categorySlug?.trim()) {
      const normalizedCategorySlug = params.categorySlug.trim();
      filters.push(
        `primaryCategorySlug = "${normalizedCategorySlug}" OR categoryPathSlugs = "${normalizedCategorySlug}"`,
      );
    }
    if (params.colorNames?.length) {
      const clauses = params.colorNames
        .filter((value) => value.trim().length > 0)
        .map((value) => `colorNames = "${value.trim()}"`);
      if (clauses.length > 0) {
        filters.push(clauses.join(' OR '));
      }
    }
    if (params.sizeLabels?.length) {
      const clauses = params.sizeLabels
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((value) => `sizeLabels = "${value}"`);
      if (clauses.length > 0) {
        filters.push(clauses.join(' OR '));
      }
    }
    if (params.minPrice !== undefined) {
      filters.push(`maxPrice >= ${params.minPrice}`);
    }
    if (params.maxPrice !== undefined) {
      filters.push(`minPrice <= ${params.maxPrice}`);
    }
    return filters;
  }

  private buildSorts(params: SearchProductIdsParams): string[] | undefined {
    if (params.sort === 'newest') {
      return ['createdAtTs:desc'];
    }
    if (params.sort === 'price_asc') {
      return ['minPrice:asc', 'createdAtTs:desc'];
    }
    if (params.sort === 'price_desc') {
      return ['minPrice:desc', 'createdAtTs:desc'];
    }
    return undefined;
  }

  async searchProductIds(params: string | SearchProductIdsParams): Promise<number[] | null> {
    const searchParams: SearchProductIdsParams =
      typeof params === 'string' ? { query: params } : params;
    const normalizedQuery = this.normalizeSearchText(searchParams.query ?? '');
    const filters = this.buildSearchFilters(searchParams);
    const sorts = this.buildSorts(searchParams);
    if (!normalizedQuery && filters.length === 0 && !sorts?.length) {
      return null;
    }
    if (!this.meilisearchService.isEnabled()) {
      return null;
    }
    try {
      await this.ensureProductIndex();
      const index = this.meilisearchService
        .getClient()
        .index<ProductSearchDocument>(this.meilisearchService.getProductIndexUid());
      const collectedHits: ProductSearchDocument[] = [];
      let offset = 0;
      while (offset < SEARCH_FETCH_LIMIT) {
        const remaining = SEARCH_FETCH_LIMIT - offset;
        const limit = Math.min(SEARCH_FETCH_BATCH, remaining);
        const result = await index.search(normalizedQuery, {
          limit,
          offset,
          ...(filters.length > 0 ? { filter: filters } : {}),
          ...(sorts ? { sort: sorts } : {}),
        });
        const hits = result.hits;
        if (hits.length === 0) {
          break;
        }
        collectedHits.push(...hits);
        offset += hits.length;
        if (hits.length < limit) {
          break;
        }
      }
      if (searchParams.sort && searchParams.sort !== 'relevance') {
        return collectedHits.map((hit) => hit.id);
      }
      const queryTokens = this.tokenizeSearchText(normalizedQuery);
      const sortedHits = collectedHits
        .map((hit, index) => ({
          id: hit.id,
          score: this.scoreSearchHit({
            queryNormalized: normalizedQuery,
            queryTokens,
            nameNormalized: hit.nameNormalized,
            descriptionNormalized: hit.descriptionNormalized,
            primaryCategoryNameNormalized: hit.primaryCategoryNameNormalized,
            categorySearchTextNormalized: hit.categorySearchTextNormalized,
            colorNamesNormalized: hit.colorNamesNormalized,
            searchTextNormalized: hit.searchTextNormalized,
            baseRank: index,
          }),
        }))
        .sort((left, right) => right.score - left.score)
        .map((item) => item.id);
      return sortedHits;
    } catch (error) {
      this.logger.warn(
        `Search engine unavailable, fallback to DB search: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Lấy phân bố facet (color/size) từ Meilisearch dựa trên bộ lọc hiện tại.
   * Trả về null nếu Meilisearch không khả dụng.
   */
  async getFacetDistribution(params: SearchProductIdsParams): Promise<{
    colorNames: Record<string, number>;
    sizeLabels: Record<string, number>;
  } | null> {
    if (!this.meilisearchService.isEnabled()) {
      return null;
    }
    try {
      await this.ensureProductIndex();
      const index = this.meilisearchService
        .getClient()
        .index(this.meilisearchService.getProductIndexUid());
      const normalizedQuery = this.normalizeSearchText(params.query ?? '');
      const filters = this.buildSearchFilters(params);
      const result = await index.search(normalizedQuery, {
        limit: 0,
        ...(filters.length > 0 ? { filter: filters } : {}),
        facets: ['colorNames', 'sizeLabels'],
      });
      return {
        colorNames: result.facetDistribution?.colorNames ?? {},
        sizeLabels: result.facetDistribution?.sizeLabels ?? {},
      };
    } catch (error) {
      this.logger.warn(
        `Search engine unavailable for facets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }
}
