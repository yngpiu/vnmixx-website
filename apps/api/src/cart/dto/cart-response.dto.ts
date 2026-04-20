import { ApiProperty } from '@nestjs/swagger';

/**
 * CartItemColorDto: DTO đại diện cho thông tin màu sắc của sản phẩm trong giỏ hàng.
 */
class CartItemColorDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Đen' })
  name: string;

  @ApiProperty({ example: '#000000' })
  hexCode: string;
}

/**
 * CartItemSizeDto: DTO đại diện cho thông tin kích thước của sản phẩm trong giỏ hàng.
 */
class CartItemSizeDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'M' })
  label: string;
}

/**
 * CartItemProductDto: DTO đại diện cho thông tin cơ bản của sản phẩm cha trong giỏ hàng.
 */
class CartItemProductDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Basic Tee' })
  name: string;

  @ApiProperty({ example: 'ao-basic-tee' })
  slug: string;

  @ApiProperty({ example: 'https://example.com/thumb.jpg', nullable: true })
  thumbnail: string | null;
}

/**
 * CartItemVariantDto: DTO đại diện cho thông tin biến thể cụ thể của sản phẩm trong giỏ hàng.
 * Bao gồm thông tin về SKU, giá, và trạng thái tồn kho (onHand, reserved).
 */
class CartItemVariantDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'BT-DEN-M' })
  sku: string;

  @ApiProperty({ example: 299000 })
  price: number;

  @ApiProperty({ example: 50, description: 'Tồn kho thực tế tại cửa hàng' })
  onHand: number;

  @ApiProperty({ example: 5, description: 'Số lượng đang được giữ cho đơn hàng khác' })
  reserved: number;

  @ApiProperty({ type: CartItemColorDto })
  color: CartItemColorDto;

  @ApiProperty({ type: CartItemSizeDto })
  size: CartItemSizeDto;

  @ApiProperty({ type: CartItemProductDto })
  product: CartItemProductDto;
}

/**
 * CartItemResponseDto: DTO phản hồi cho một mục trong giỏ hàng.
 * Chứa thông tin về số lượng và chi tiết biến thể sản phẩm.
 */
export class CartItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: CartItemVariantDto })
  variant: CartItemVariantDto;
}

/**
 * CartResponseDto: DTO phản hồi toàn bộ giỏ hàng của khách hàng.
 * Vai trò: Cung cấp cấu trúc dữ liệu chuẩn để hiển thị giỏ hàng trên giao diện người dùng.
 */
export class CartResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];
}
