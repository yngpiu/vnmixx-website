import { ApiProperty } from '@nestjs/swagger';
import { ProductListColorResponseDto } from '../../product/dto/product-response.dto';

// DTO đại diện cho thông tin giá của biến thể sản phẩm trong wishlist.
export class WishlistProductVariantDto {
  @ApiProperty({ example: 299000 })
  price: number;
}

// DTO chứa thông tin sản phẩm hiển thị trong danh sách yêu thích.
export class WishlistProductDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Basic Tee' })
  name: string;

  @ApiProperty({ example: 'ao-basic-tee' })
  slug: string;

  @ApiProperty({ type: [ProductListColorResponseDto] })
  colors: ProductListColorResponseDto[];

  @ApiProperty({ type: [WishlistProductVariantDto] })
  variants: WishlistProductVariantDto[];
}

// DTO phản hồi cho một mục trong danh sách yêu thích.
export class WishlistItemResponseDto {
  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: WishlistProductDto })
  product: WishlistProductDto;
}
