import { Module } from '@nestjs/common';
import { MeilisearchService } from './services/meilisearch.service';

@Module({
  providers: [MeilisearchService],
  exports: [MeilisearchService],
})
export class MeilisearchModule {}
