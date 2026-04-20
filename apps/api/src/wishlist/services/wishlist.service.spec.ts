import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from 'generated/prisma/client';
import { WishlistItemView, WishlistRepository } from '../repositories/wishlist.repository';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  let service: WishlistService;
  let repo: jest.Mocked<WishlistRepository>;

  beforeEach(async () => {
    const mockRepo = {
      findAllByCustomerId: jest.fn(),
      productExists: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<WishlistRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        {
          provide: WishlistRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    repo = module.get(WishlistRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all wishlist items for a customer', async () => {
      const customerId = 1;
      const expectedItems: WishlistItemView[] = [
        {
          createdAt: new Date(),
          product: { id: 100, name: 'P', slug: 's', thumbnail: null, variants: [] },
        },
      ];
      repo.findAllByCustomerId.mockResolvedValue(expectedItems);

      const result = await service.findAll(customerId);

      expect(result).toEqual(expectedItems);
      expect(repo.findAllByCustomerId).toHaveBeenCalledWith(customerId);
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

    it('should throw original error if not P2002', async () => {
      repo.productExists.mockResolvedValue(true);
      const error = new Error('Unknown error');
      repo.add.mockRejectedValue(error);

      await expect(service.add(customerId, productId)).rejects.toThrow('Unknown error');
    });

    it('should add product successfully', async () => {
      repo.productExists.mockResolvedValue(true);
      repo.add.mockResolvedValue(undefined);

      await service.add(customerId, productId);

      expect(repo.add).toHaveBeenCalledWith(customerId, productId);
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

    it('should throw original error if not P2025', async () => {
      const error = new Error('Unknown error');
      repo.remove.mockRejectedValue(error);

      await expect(service.remove(customerId, productId)).rejects.toThrow('Unknown error');
    });

    it('should remove product successfully', async () => {
      repo.remove.mockResolvedValue(undefined);

      await service.remove(customerId, productId);

      expect(repo.remove).toHaveBeenCalledWith(customerId, productId);
    });
  });
});
