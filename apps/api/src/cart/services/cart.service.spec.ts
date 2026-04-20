import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CartRepository } from '../repositories/cart.repository';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let repo: jest.Mocked<CartRepository>;

  beforeEach(async () => {
    const mockRepo = {
      findOrCreate: jest.fn(),
      findVariant: jest.fn(),
      findCartItemByVariant: jest.fn(),
      addItem: jest.fn(),
      findCartItemById: jest.fn(),
      updateItemQuantity: jest.fn(),
      removeItem: jest.fn(),
      findByCustomerId: jest.fn(),
      clearCart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: CartRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    repo = module.get(CartRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return a cart for a customer', async () => {
      const customerId = 1;
      const expectedCart = { id: 1, customerId, items: [] } as any;
      repo.findOrCreate.mockResolvedValue(expectedCart);

      const result = await service.getCart(customerId);

      expect(result).toEqual(expectedCart);
      expect(repo.findOrCreate).toHaveBeenCalledWith(customerId);
    });
  });

  describe('addItem', () => {
    const customerId = 1;
    const variantId = 100;
    const dto = { variantId, quantity: 2 };
    const cart = { id: 10, customerId };

    it('should throw NotFoundException if variant does not exist', async () => {
      repo.findVariant.mockResolvedValue(null);

      await expect(service.addItem(customerId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      const variant = { id: variantId, onHand: 5, reserved: 4 } as any; // available: 1
      repo.findVariant.mockResolvedValue(variant);
      repo.findOrCreate.mockResolvedValue(cart as any);
      repo.findCartItemByVariant.mockResolvedValue(null);

      await expect(service.addItem(customerId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if stock is insufficient (with existing item)', async () => {
      const variant = { id: variantId, onHand: 5, reserved: 2 } as any; // available: 3
      const existingItem = { id: 1, variantId, quantity: 2 } as any;
      repo.findVariant.mockResolvedValue(variant);
      repo.findOrCreate.mockResolvedValue(cart as any);
      repo.findCartItemByVariant.mockResolvedValue(existingItem);

      // 2 (existing) + 2 (new) = 4, but available is 3
      await expect(service.addItem(customerId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should add item successfully', async () => {
      const variant = { id: variantId, onHand: 10, reserved: 0 } as any;
      const addedItem = { id: 1, variantId, quantity: 2 } as any;
      repo.findVariant.mockResolvedValue(variant);
      repo.findOrCreate.mockResolvedValue(cart as any);
      repo.findCartItemByVariant.mockResolvedValue(null);
      repo.addItem.mockResolvedValue(addedItem);

      const result = await service.addItem(customerId, dto);

      expect(result).toEqual(addedItem);
      expect(repo.addItem).toHaveBeenCalledWith(cart.id, variantId, dto.quantity);
    });
  });

  describe('updateItem', () => {
    const customerId = 1;
    const itemId = 1;
    const cart = { id: 10, customerId };
    const dto = { quantity: 5 };

    it('should throw NotFoundException if item does not exist in cart', async () => {
      repo.findOrCreate.mockResolvedValue(cart as any);
      repo.findCartItemById.mockResolvedValue(null);

      await expect(service.updateItem(customerId, itemId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if variant no longer exists or stock insufficient', async () => {
      const item = { id: itemId, variantId: 100 } as any;
      repo.findOrCreate.mockResolvedValue(cart as any);
      repo.findCartItemById.mockResolvedValue(item);
      repo.findVariant.mockResolvedValue(null);

      await expect(service.updateItem(customerId, itemId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if stock is insufficient when updating', async () => {
      const item = { id: itemId, variantId: 100 } as any;
      const variant = { id: 100, onHand: 4, reserved: 0 } as any; // available: 4, requested: 5
      repo.findOrCreate.mockResolvedValue(cart as any);
      repo.findCartItemById.mockResolvedValue(item);
      repo.findVariant.mockResolvedValue(variant);

      await expect(service.updateItem(customerId, itemId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update item quantity successfully', async () => {
      const item = { id: itemId, variantId: 100 } as any;
      const variant = { id: 100, onHand: 10, reserved: 0 } as any;
      const updatedItem = { ...item, quantity: 5 };
      repo.findOrCreate.mockResolvedValue(cart as any);
      repo.findCartItemById.mockResolvedValue(item);
      repo.findVariant.mockResolvedValue(variant);
      repo.updateItemQuantity.mockResolvedValue(updatedItem);

      const result = await service.updateItem(customerId, itemId, dto);

      expect(result).toEqual(updatedItem);
      expect(repo.updateItemQuantity).toHaveBeenCalledWith(itemId, dto.quantity);
    });
  });

  describe('removeItem', () => {
    const customerId = 1;
    const itemId = 1;
    const cart = { id: 10, customerId };

    it('should throw NotFoundException if item does not exist', async () => {
      repo.findOrCreate.mockResolvedValue(cart as any);
      repo.findCartItemById.mockResolvedValue(null);

      await expect(service.removeItem(customerId, itemId)).rejects.toThrow(NotFoundException);
    });

    it('should remove item successfully', async () => {
      const item = { id: itemId } as any;
      repo.findOrCreate.mockResolvedValue(cart as any);
      repo.findCartItemById.mockResolvedValue(item);

      await service.removeItem(customerId, itemId);

      expect(repo.removeItem).toHaveBeenCalledWith(itemId);
    });
  });

  describe('clearCart', () => {
    it('should do nothing if cart does not exist', async () => {
      repo.findByCustomerId.mockResolvedValue(null);

      await service.clearCart(1);

      expect(repo.clearCart).not.toHaveBeenCalled();
    });

    it('should clear cart successfully', async () => {
      const cart = { id: 10 };
      repo.findByCustomerId.mockResolvedValue(cart as any);

      await service.clearCart(1);

      expect(repo.clearCart).toHaveBeenCalledWith(cart.id);
    });
  });
});
