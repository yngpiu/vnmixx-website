import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../../redis/redis.service';
import { ProductCacheService } from './product-cache.service';

describe('ProductCacheService', () => {
  let service: ProductCacheService;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCacheService,
        {
          provide: RedisService,
          useValue: {
            del: jest.fn(),
            deleteByPattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductCacheService>(ProductCacheService);
    redis = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('invalidateProductCache should delete detail and list patterns', async () => {
    await service.invalidateProductCache('test-slug');
    expect(redis.del).toHaveBeenCalledWith('prod:slug:test-slug');
    expect(redis.deleteByPattern).toHaveBeenCalledWith('prod:list:*');
  });

  it('deleteSlugCache should delete specific slug', async () => {
    await service.deleteSlugCache('test-slug');
    expect(redis.del).toHaveBeenCalledWith('prod:slug:test-slug');
  });

  it('hashQuery should return same hash for same params in different order', () => {
    const params1 = { page: 1, limit: 10, category: 'cat' };
    const params2 = { limit: 10, category: 'cat', page: 1 };

    const hash1 = service.hashQuery(params1);
    const hash2 = service.hashQuery(params2);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(8);
  });

  it('hashQuery should handle array values', () => {
    const params1 = { ids: [1, 2] };
    const params2 = { ids: [2, 1] };

    const hash1 = service.hashQuery(params1);
    const hash2 = service.hashQuery(params2);

    expect(hash1).toBe(hash2);
  });
});
