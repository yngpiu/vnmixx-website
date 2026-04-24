import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaErrorCode } from '../../common/utils/prisma.util';
import { type WishlistItemView, WishlistRepository } from '../repositories/wishlist.repository';

// Quản lý danh sách sản phẩm yêu thích của khách hàng.
// Giúp lưu giữ các mặt hàng khách hàng quan tâm để thúc đẩy tỷ lệ chuyển đổi trong tương lai.
@Injectable()
export class WishlistService {
  constructor(private readonly wishlistRepo: WishlistRepository) {}

  // Lấy toàn bộ danh sách yêu thích để hiển thị cho khách hàng.
  async findAll(customerId: number): Promise<WishlistItemView[]> {
    return this.wishlistRepo.findAllByCustomerId(customerId);
  }

  // Thêm sản phẩm vào danh sách yêu thích.
  async add(customerId: number, productId: number): Promise<void> {
    // 1. Kiểm tra sản phẩm có tồn tại trên hệ thống hay không.
    const productExists = await this.wishlistRepo.productExists(productId);
    if (!productExists) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
    }

    try {
      // 2. Lưu liên kết giữa khách hàng và sản phẩm vào database.
      await this.wishlistRepo.add(customerId, productId);
    } catch (error) {
      // Xử lý trường hợp sản phẩm đã tồn tại trong danh sách để tránh lỗi Duplicate Key.
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích.');
      }
      if (isPrismaErrorCode(error, 'P2003')) {
        throw new BadRequestException('Không thể thêm sản phẩm vào danh sách yêu thích.');
      }
      throw error;
    }
  }

  // Xoá sản phẩm khỏi danh sách yêu thích.
  async remove(customerId: number, productId: number): Promise<void> {
    try {
      // Thực hiện xóa bản ghi liên kết trong database.
      await this.wishlistRepo.remove(customerId, productId);
    } catch (error) {
      // Báo lỗi nếu sản phẩm chưa từng có trong danh sách yêu thích.
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
