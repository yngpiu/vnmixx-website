import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { type WishlistItemView, WishlistRepository } from '../repositories/wishlist.repository';

@Injectable()
export class WishlistService {
  constructor(private readonly wishlistRepo: WishlistRepository) {}

  async findAll(customerId: number): Promise<WishlistItemView[]> {
    return this.wishlistRepo.findAllByCustomerId(customerId);
  }

  async add(customerId: number, productId: number): Promise<void> {
    const productExists = await this.wishlistRepo.productExists(productId);
    if (!productExists) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
    }

    try {
      await this.wishlistRepo.add(customerId, productId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích.');
      }
      throw error;
    }
  }

  async remove(customerId: number, productId: number): Promise<void> {
    try {
      await this.wishlistRepo.remove(customerId, productId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Sản phẩm không có trong danh sách yêu thích.');
      }
      throw error;
    }
  }
}
