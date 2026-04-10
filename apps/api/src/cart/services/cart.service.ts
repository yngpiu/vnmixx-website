import { Injectable, NotFoundException } from '@nestjs/common';
import type { AddCartItemDto, UpdateCartItemDto } from '../dto';
import { type CartItemView, type CartView, CartRepository } from '../repositories/cart.repository';

@Injectable()
export class CartService {
  constructor(private readonly cartRepo: CartRepository) {}

  async getCart(customerId: number): Promise<CartView> {
    return this.cartRepo.findOrCreate(customerId);
  }

  async addItem(customerId: number, dto: AddCartItemDto): Promise<CartItemView> {
    const variantExists = await this.cartRepo.variantExists(dto.variantId);
    if (!variantExists) {
      throw new NotFoundException(`Không tìm thấy biến thể sản phẩm #${dto.variantId}`);
    }

    const cart = await this.cartRepo.findOrCreate(customerId);
    return this.cartRepo.addItem(cart.id, dto.variantId, dto.quantity);
  }

  async updateItem(
    customerId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartItemView> {
    const cart = await this.cartRepo.findOrCreate(customerId);
    const item = await this.cartRepo.findCartItemById(itemId, cart.id);
    if (!item) {
      throw new NotFoundException(`Không tìm thấy mục giỏ hàng #${itemId}`);
    }

    return this.cartRepo.updateItemQuantity(itemId, dto.quantity);
  }

  async removeItem(customerId: number, itemId: number): Promise<void> {
    const cart = await this.cartRepo.findOrCreate(customerId);
    const item = await this.cartRepo.findCartItemById(itemId, cart.id);
    if (!item) {
      throw new NotFoundException(`Không tìm thấy mục giỏ hàng #${itemId}`);
    }

    await this.cartRepo.removeItem(itemId);
  }

  async clearCart(customerId: number): Promise<void> {
    const cart = await this.cartRepo.findByCustomerId(customerId);
    if (!cart) return;

    await this.cartRepo.clearCart(cart.id);
  }
}
