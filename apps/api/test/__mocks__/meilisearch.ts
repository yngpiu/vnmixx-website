/**
 * Stub for Jest: the real `meilisearch` package ships ESM-only and cannot be parsed
 * under the default Nest/Jest CJS pipeline.
 */
export class Meilisearch {
  public constructor(..._unused: unknown[]) {
    void _unused;
  }
}

export type Settings = {
  searchableAttributes?: readonly string[];
  filterableAttributes?: readonly string[];
  sortableAttributes?: readonly string[];
  displayedAttributes?: readonly string[];
};
