import { ApiProperty } from '@nestjs/swagger';

export class BannerCategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Nữ' })
  name: string;

  @ApiProperty({ example: 'nu' })
  slug: string;
}

export class BannerResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'https://media.vnmixx.shop/banner/sale-thang-4.jpg' })
  imageUrl: string;

  @ApiProperty({ example: 2 })
  categoryId: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ type: () => BannerCategoryDto })
  category: BannerCategoryDto;

  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class BannerAdminResponseDto extends BannerResponseDto {}
