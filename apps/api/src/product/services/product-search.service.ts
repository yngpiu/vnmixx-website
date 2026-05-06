import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Settings } from 'meilisearch';
import { MeilisearchService } from '../../meilisearch/services/meilisearch.service';
import { ProductRepository } from '../repositories/product.repository';

const SEARCH_FETCH_BATCH = 80;
const SEARCH_FETCH_LIMIT = 240;

type ProductSearchDocument = {
  id: number;
  name: string;
  nameNormalized: string;
  isActive: boolean;
  deletedAtNull: boolean;
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

  private mapToSearchDocument(document: {
    id: number;
    name: string;
    isActive: boolean;
    deletedAtNull: boolean;
  }): ProductSearchDocument {
    return {
      ...document,
      nameNormalized: this.normalizeSearchText(document.name),
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
    baseRank: number;
  }): number {
    const startsWithQuery = params.nameNormalized.startsWith(params.queryNormalized);
    const containsWholeQuery = params.nameNormalized.includes(params.queryNormalized);
    const hasAllTokens = params.queryTokens.every((token) => params.nameNormalized.includes(token));
    const prefixTokenMatches = this.countPrefixTokenMatches({
      nameNormalized: params.nameNormalized,
      tokens: params.queryTokens,
    });
    return (
      (startsWithQuery ? 1000 : 0) +
      (containsWholeQuery ? 300 : 0) +
      (hasAllTokens ? 200 : 0) +
      prefixTokenMatches * 25 -
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
      searchableAttributes: ['name', 'nameNormalized'],
      filterableAttributes: ['isActive', 'deletedAtNull'],
      sortableAttributes: ['id'],
      displayedAttributes: ['id', 'name', 'nameNormalized', 'isActive', 'deletedAtNull'],
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

  async searchProductIds(query: string): Promise<number[] | null> {
    const normalizedQuery = this.normalizeSearchText(query);
    if (!normalizedQuery) {
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
          filter: ['isActive = true', 'deletedAtNull = true'],
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
      const queryTokens = this.tokenizeSearchText(normalizedQuery);
      const sortedHits = collectedHits
        .map((hit, index) => ({
          id: hit.id,
          score: this.scoreSearchHit({
            queryNormalized: normalizedQuery,
            queryTokens,
            nameNormalized: hit.nameNormalized,
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
}
