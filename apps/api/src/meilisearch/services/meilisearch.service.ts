import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meilisearch } from 'meilisearch';

@Injectable()
export class MeilisearchService {
  private readonly host: string | null;
  private readonly masterKey: string | null;
  private readonly productIndexUid: string;
  private readonly client: Meilisearch | null;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.host = this.configService.get<string>('MEILISEARCH_HOST') ?? null;
    this.masterKey = this.configService.get<string>('MEILISEARCH_MASTER_KEY') ?? null;
    this.productIndexUid =
      this.configService.get<string>('MEILISEARCH_PRODUCT_INDEX') ?? 'products';
    this.client = this.host
      ? new Meilisearch({ host: this.host, apiKey: this.masterKey ?? undefined })
      : null;
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  getProductIndexUid(): string {
    return this.productIndexUid;
  }

  getClient(): Meilisearch {
    if (!this.client) {
      throw new Error('Meilisearch is disabled. Set MEILISEARCH_HOST to enable it.');
    }
    return this.client;
  }
}
