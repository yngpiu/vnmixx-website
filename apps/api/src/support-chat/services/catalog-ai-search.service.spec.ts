import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../../product/services/product.service';
import { CatalogAiSearchService } from './catalog-ai-search.service';

describe('CatalogAiSearchService', () => {
  let service: CatalogAiSearchService;
  let productService: { findPublicList: jest.Mock };

  beforeEach(async () => {
    productService = {
      findPublicList: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogAiSearchService, { provide: ProductService, useValue: productService }],
    }).compile();

    service = module.get<CatalogAiSearchService>(CatalogAiSearchService);
  });

  it('should delegate to product search list and map result', async () => {
    productService.findPublicList.mockResolvedValue({
      data: [
        {
          id: 22,
          name: 'Áo dài Bạch Nguyệt',
          slug: 'ao-dai-bach-nguyet',
          colors: [],
          variants: [
            { price: 2_000_000, color: { name: 'Trắng' }, size: { label: 'L' } },
            { price: 2_100_000, color: { name: 'Đen' }, size: { label: 'M' } },
          ],
          category: null,
          minPrice: 2_000_000,
          maxPrice: 2_100_000,
        },
      ],
      meta: { page: 1, limit: 6, total: 1, totalPages: 1 },
    });

    const result = await service.search({ query: 'áo dài', category: 'ao-dai' });

    expect(productService.findPublicList).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 6,
        search: 'áo dài',
        categorySlug: 'ao-dai',
        sort: 'relevance',
      }),
    );
    expect(result).toEqual([
      {
        name: 'Áo dài Bạch Nguyệt',
        slug: 'ao-dai-bach-nguyet',
        minPrice: 2_000_000,
        colors: ['Trắng', 'Đen'],
        sizes: ['L', 'M'],
        link: 'https://vnmixx.shop/products/ao-dai-bach-nguyet',
      },
    ]);
  });

  it('should pass query as-is and ignore non-slug category', async () => {
    productService.findPublicList.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 6, total: 0, totalPages: 0 },
    });

    await service.search({ query: 'bạn có bán áo dài không?' });

    expect(productService.findPublicList).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'bạn có bán áo dài không?',
        sort: 'relevance',
        categorySlug: undefined,
      }),
    );
  });
});
