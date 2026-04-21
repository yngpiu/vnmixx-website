import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaErrorCode } from '../../common/errors/prisma-error.util';
import { type WishlistItemView, WishlistRepository } from '../repositories/wishlist.repository';

/**
 * WishlistService: Dịch vụ quản lý danh sách sản phẩm yêu thích.
 * Vai trò: Xử lý các nghiệp vụ liên quan đến wishlist của khách hàng.
 */
@Injectable()
export class WishlistService {
  constructor(private readonly wishlistRepo: WishlistRepository) {}

  /**
   * Lấy toàn bộ danh sách sản phẩm yêu thích của một khách hàng.
   * @param customerId ID của khách hàng.
   */
  async findAll(customerId: number): Promise<WishlistItemView[]> {
    return this.wishlistRepo.findAllByCustomerId(customerId);
  }

  /**
   * Thêm một sản phẩm vào danh sách yêu thích.
   * Logic: Kiểm tra sản phẩm có tồn tại không, sau đó thêm vào DB. Xử lý lỗi nếu sản phẩm đã tồn tại trong wishlist.
   * @param customerId ID của khách hàng.
   * @param productId ID của sản phẩm muốn thêm.
   */
  async add(customerId: number, productId: number): Promise<void> {
    const productExists = await this.wishlistRepo.productExists(productId);
    if (!productExists) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
    }

    try {
      await this.wishlistRepo.add(customerId, productId);
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích.');
      }
      if (isPrismaErrorCode(error, 'P2003')) {
        throw new BadRequestException('Không thể thêm sản phẩm vào danh sách yêu thích.');
      }
      throw error;
    }
  }

  /**
   * Xoá một sản phẩm khỏi danh sách yêu thích.
   * Logic: Thực hiện xoá dựa trên cặp customerId và productId. Xử lý lỗi nếu sản phẩm không có trong wishlist.
   * @param customerId ID của khách hàng.
   * @param productId ID của sản phẩm muốn xoá.
   */
  async remove(customerId: number, productId: number): Promise<void> {
    try {
      await this.wishlistRepo.remove(customerId, productId);
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2025')) {
        throw new NotFoundException('Sản phẩm không có trong danh sách yêu thích.');
      }
      if (isPrismaErrorCode(error, 'P2003')) {
        throw new BadRequestException('Không thể xóa sản phẩm khỏi danh sách yêu thích.');
      }
      throw error;
    }
  }
}
