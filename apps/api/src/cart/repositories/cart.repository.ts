import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const CART_ITEM_SELECT = {
  id: true,
  quantity: true,
  createdAt: true,
  updatedAt: true,
  variant: {
    select: {
      id: true,
      sku: true,
      price: true,
      salePrice: true,
      onHand: true,
      reserved: true,
      color: { select: { id: true, name: true, hexCode: true } },
      size: { select: { id: true, label: true } },
      product: { select: { id: true, name: true, slug: true, thumbnail: true } },
    },
  },
} as const;

const CART_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: CART_ITEM_SELECT,
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

export interface CartItemView {
  id: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  variant: {
    id: number;
    sku: string;
    price: number;
    salePrice: number | null;
    onHand: number;
    reserved: number;
    color: { id: number; name: string; hexCode: string };
    size: { id: number; label: string };
    product: { id: number; name: string; slug: string; thumbnail: string | null };
  };
}

export interface CartView {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemView[];
}

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCustomerId(customerId: number): Promise<CartView | null> {
    return this.prisma.cart.findUnique({
      where: { customerId },
      select: CART_SELECT,
    }) as unknown as Promise<CartView | null>;
  }

  async findOrCreate(customerId: number): Promise<CartView> {
    const existing = await this.findByCustomerId(customerId);
    if (existing) return existing;

    return this.prisma.cart.create({
      data: { customerId },
      select: CART_SELECT,
    }) as unknown as Promise<CartView>;
  }

  async findCartItemByVariant(cartId: number, variantId: number) {
    return this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId, variantId } },
    });
  }

  async findCartItemById(itemId: number, cartId: number) {
    return this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
    });
  }

  async addItem(cartId: number, variantId: number, quantity: number): Promise<CartItemView> {
    return this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      create: { cartId, variantId, quantity },
      update: { quantity: { increment: quantity } },
      select: CART_ITEM_SELECT,
    }) as unknown as Promise<CartItemView>;
  }

  async updateItemQuantity(itemId: number, quantity: number): Promise<CartItemView> {
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      select: CART_ITEM_SELECT,
    }) as unknown as Promise<CartItemView>;
  }

  async removeItem(itemId: number): Promise<void> {
    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(cartId: number): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
  }

  async findVariant(variantId: number) {
    return this.prisma.productVariant.findFirst({
      where: { id: variantId, isActive: true, deletedAt: null },
      select: { id: true, onHand: true, reserved: true },
    });
  }
}
