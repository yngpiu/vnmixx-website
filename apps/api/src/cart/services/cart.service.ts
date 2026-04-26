import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AddCartItemDto, UpdateCartItemDto } from '../dto';
import { type CartItemView, type CartView, CartRepository } from '../repositories/cart.repository';

@Injectable()
// Xử lý nghiệp vụ quản lý giỏ hàng, bao gồm thêm, sửa, xóa và kiểm tra tồn kho.
export class CartService {
  constructor(private readonly cartRepo: CartRepository) {}

  // Truy xuất giỏ hàng của khách hàng, tự động khởi tạo nếu chưa có.
  async getCart(customerId: number): Promise<CartView> {
    return this.cartRepo.findOrCreate(customerId);
  }

  // Thêm sản phẩm vào giỏ hàng sau khi kiểm tra sự tồn tại và tồn kho của biến thể.
  async addItem(customerId: number, dto: AddCartItemDto): Promise<CartItemView> {
    const variant = await this.cartRepo.findVariant(dto.variantId);
    if (!variant) {
      throw new NotFoundException(`Không tìm thấy biến thể sản phẩm #${dto.variantId}`);
    }

    const cart = await this.cartRepo.findOrCreate(customerId);

    // Kiểm tra tổng số lượng yêu cầu so với tồn kho thực tế khả dụng.
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

  // Cập nhật số lượng mới cho một mục trong giỏ hàng và kiểm tra lại tồn kho.
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

    // Đảm bảo biến thể vẫn tồn tại và đủ số lượng để cập nhật.
    const variant = await this.cartRepo.findVariant(item.variantId);
    const availableQty = variant ? variant.onHand - variant.reserved : 0;
    if (!variant || dto.quantity > availableQty) {
      throw new BadRequestException(
        `Số lượng tồn kho không đủ. Có thể bán: ${availableQty}, yêu cầu: ${dto.quantity}`,
      );
    }

    return this.cartRepo.updateItemQuantity(itemId, dto.quantity);
  }

  // Loại bỏ một sản phẩm khỏi giỏ hàng sau khi xác nhận quyền sở hữu.
  async removeItem(customerId: number, itemId: number): Promise<void> {
    const cart = await this.cartRepo.findOrCreate(customerId);
    const item = await this.cartRepo.findCartItemById(itemId, cart.id);
    if (!item) {
      throw new NotFoundException(`Không tìm thấy mục giỏ hàng #${itemId}`);
    }

    await this.cartRepo.removeItem(itemId);
  }

  // Xóa toàn bộ sản phẩm trong giỏ hàng của khách hàng.
  async clearCart(customerId: number): Promise<void> {
    const cart = await this.cartRepo.findByCustomerId(customerId);
    if (!cart) return;

    await this.cartRepo.clearCart(cart.id);
  }
}
