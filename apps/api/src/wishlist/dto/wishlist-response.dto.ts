import { ApiProperty } from '@nestjs/swagger';

class WishlistProductVariantDto {
  @ApiProperty({ example: 299000 })
  price: number;

  @ApiProperty({ example: 249000, nullable: true })
  salePrice: number | null;
}

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

export class WishlistItemResponseDto {
  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: WishlistProductDto })
  product: WishlistProductDto;
}
