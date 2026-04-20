import { ApiProperty } from '@nestjs/swagger';

/**
 * WishlistProductVariantDto: DTO đại diện cho thông tin giá của biến thể sản phẩm trong wishlist.
 */
class WishlistProductVariantDto {
  @ApiProperty({ example: 299000 })
  price: number;
}

/**
 * WishlistProductDto: DTO chứa thông tin sản phẩm hiển thị trong danh sách yêu thích.
 */
class WishlistProductDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Basic Tee' })
  name: string;

  @ApiProperty({ example: 'ao-basic-tee' })
  slug: string;

  @ApiProperty({ example: 'https://example.com/thumb.jpg', nullable: true })
  thumbnail: string | null;

  @ApiProperty({ type: [WishlistProductVariantDto] })
  variants: WishlistProductVariantDto[];
}

/**
 * WishlistItemResponseDto: DTO phản hồi cho một mục trong danh sách yêu thích.
 * Vai trò: Trả về thông tin ngày thêm và chi tiết sản phẩm cho client.
 */
export class WishlistItemResponseDto {
  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: WishlistProductDto })
  product: WishlistProductDto;
}
