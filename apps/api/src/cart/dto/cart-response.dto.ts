import { ApiProperty } from '@nestjs/swagger';

class CartItemColorDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Đen' })
  name: string;

  @ApiProperty({ example: '#000000' })
  hexCode: string;
}

class CartItemSizeDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'M' })
  label: string;
}

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

class CartItemVariantDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'BT-DEN-M' })
  sku: string;

  @ApiProperty({ example: 299000 })
  price: number;

  @ApiProperty({ example: 249000, nullable: true })
  salePrice: number | null;

  @ApiProperty({ example: 50 })
  stockQty: number;

  @ApiProperty({ type: CartItemColorDto })
  color: CartItemColorDto;

  @ApiProperty({ type: CartItemSizeDto })
  size: CartItemSizeDto;

  @ApiProperty({ type: CartItemProductDto })
  product: CartItemProductDto;
}

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
