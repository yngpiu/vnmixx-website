import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AddCartItemDto, UpdateCartItemDto } from '../dto';
import { type CartItemView, type CartView, CartRepository } from '../repositories/cart.repository';

/**
 * CartService: Quản lý giỏ hàng của khách hàng.
 * Vai trò: Thực hiện các nghiệp vụ thêm, sửa, xóa sản phẩm trong giỏ và kiểm tra tồn kho.
 */
@Injectable()
export class CartService {
  constructor(private readonly cartRepo: CartRepository) {}

  /**
   * Lấy giỏ hàng của khách hàng. Nếu chưa có sẽ tự động tạo mới.
   */
  async getCart(customerId: number): Promise<CartView> {
    return this.cartRepo.findOrCreate(customerId);
  }

  /**
   * Thêm sản phẩm vào giỏ hàng.
   * Logic:
   * 1. Kiểm tra biến thể sản phẩm có tồn tại không.
   * 2. Kiểm tra tồn kho khả dụng (onHand - reserved).
   * 3. Nếu sản phẩm đã có trong giỏ, cộng dồn số lượng.
   */
  async addItem(customerId: number, dto: AddCartItemDto): Promise<CartItemView> {
    const variant = await this.cartRepo.findVariant(dto.variantId);
    if (!variant) {
      throw new NotFoundException(`Không tìm thấy biến thể sản phẩm #${dto.variantId}`);
    }

    const cart = await this.cartRepo.findOrCreate(customerId);

    // Tính tổng số lượng sau khi thêm (bao gồm số lượng đã có trong giỏ)
    const existingItem = await this.cartRepo.findCartItemByVariant(cart.id, dto.variantId);
    const totalQty = (existingItem?.quantity ?? 0) + dto.quantity;
    const availableQty = variant.onHand - variant.reserved;

    if (totalQty > availableQty) {
      throw new BadRequestException(
        `Số lượng tồn kho không đủ. Có thể bán: ${availableQty}, yêu cầu: ${totalQty}`,
      );
    }

    return this.cartRepo.addItem(cart.id, dto.variantId, dto.quantity);
  }

  /**
   * Cập nhật số lượng của một mục trong giỏ hàng.
   * Logic: Kiểm tra quyền sở hữu giỏ hàng và kiểm tra lại tồn kho.
   */
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

    // Kiểm tra tồn kho khi cập nhật số lượng
    const variant = await this.cartRepo.findVariant(item.variantId);
    const availableQty = variant ? variant.onHand - variant.reserved : 0;
    if (!variant || dto.quantity > availableQty) {
      throw new BadRequestException(
        `Số lượng tồn kho không đủ. Có thể bán: ${availableQty}, yêu cầu: ${dto.quantity}`,
      );
    }

    return this.cartRepo.updateItemQuantity(itemId, dto.quantity);
  }

  /**
   * Xóa một sản phẩm khỏi giỏ hàng.
   */
  async removeItem(customerId: number, itemId: number): Promise<void> {
    const cart = await this.cartRepo.findOrCreate(customerId);
    const item = await this.cartRepo.findCartItemById(itemId, cart.id);
    if (!item) {
      throw new NotFoundException(`Không tìm thấy mục giỏ hàng #${itemId}`);
    }

    await this.cartRepo.removeItem(itemId);
  }

  /**
   * Xóa toàn bộ sản phẩm trong giỏ hàng (thường dùng sau khi đặt hàng thành công).
   */
  async clearCart(customerId: number): Promise<void> {
    const cart = await this.cartRepo.findByCustomerId(customerId);
    if (!cart) return;

    await this.cartRepo.clearCart(cart.id);
  }
}
