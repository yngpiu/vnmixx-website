import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from 'generated/prisma/client';
import { RedisService } from '../../redis/services/redis.service';
import { WishlistItemView, WishlistRepository } from '../repositories/wishlist.repository';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  let service: WishlistService;
  let repo: jest.Mocked<WishlistRepository>;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockRepo = {
      findAllByCustomerId: jest.fn(),
      productExists: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<WishlistRepository>;

    const mockRedis = {
      getOrSet: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        {
          provide: WishlistRepository,
          useValue: mockRepo,
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    repo = module.get(WishlistRepository);
    redis = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all wishlist items for a customer from cache/repo', async () => {
      const customerId = 1;
      const expectedItems: WishlistItemView[] = [
        {
          createdAt: new Date(),
          product: { id: 100, name: 'P', slug: 's', colors: [], variants: [] },
        },
      ];
      redis.getOrSet.mockImplementation((_key, _ttl, cb) => cb());
      repo.findAllByCustomerId.mockResolvedValue(expectedItems);

      const result = await service.findAll(customerId);

      expect(result).toEqual(expectedItems);
      expect(redis.getOrSet).toHaveBeenCalled();
    });
  });

  describe('add', () => {
    const customerId = 1;
    const productId = 100;

    it('should throw NotFoundException if product does not exist', async () => {
      repo.productExists.mockResolvedValue(false);

      await expect(service.add(customerId, productId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if product is already in wishlist', async () => {
      repo.productExists.mockResolvedValue(true);
      const error = new Prisma.PrismaClientKnownRequestError('Conflict', {
        code: 'P2002',
        clientVersion: '1.0',
      });
      repo.add.mockRejectedValue(error);

      await expect(service.add(customerId, productId)).rejects.toThrow(ConflictException);
    });

    it('should add product successfully and clear cache', async () => {
      repo.productExists.mockResolvedValue(true);
      repo.add.mockResolvedValue(undefined);
      redis.del.mockResolvedValue(undefined);

      await service.add(customerId, productId);

      expect(repo.add).toHaveBeenCalledWith(customerId, productId);
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const customerId = 1;
    const productId = 100;

    it('should throw NotFoundException if product is not in wishlist', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '1.0',
      });
      repo.remove.mockRejectedValue(error);

      await expect(service.remove(customerId, productId)).rejects.toThrow(NotFoundException);
    });

    it('should remove product successfully and clear cache', async () => {
      repo.remove.mockResolvedValue(undefined);
      redis.del.mockResolvedValue(undefined);

      await service.remove(customerId, productId);

      expect(repo.remove).toHaveBeenCalledWith(customerId, productId);
      expect(redis.del).toHaveBeenCalled();
    });
  });
});
