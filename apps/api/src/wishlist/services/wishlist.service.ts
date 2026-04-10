import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

    const alreadyExists = await this.wishlistRepo.exists(customerId, productId);
    if (alreadyExists) {
      throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích.');
    }

    await this.wishlistRepo.add(customerId, productId);
  }

  async remove(customerId: number, productId: number): Promise<void> {
    const exists = await this.wishlistRepo.exists(customerId, productId);
    if (!exists) {
      throw new NotFoundException('Sản phẩm không có trong danh sách yêu thích.');
    }

    await this.wishlistRepo.remove(customerId, productId);
  }
}
