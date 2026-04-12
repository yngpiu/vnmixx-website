import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Nested DTOs ──────────────────────────────────────────────────────────

class CategoryBriefDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Áo' })
  name: string;

  @ApiProperty({ example: 'ao' })
  slug: string;
}

class VariantColorDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Trắng' })
  name: string;

  @ApiProperty({ example: '#FFFFFF' })
  hexCode: string;
}

class VariantSizeDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'M' })
  label: string;

  @ApiProperty({ example: 2 })
  sortOrder: number;
}

class ProductAttributeDto {
  @ApiProperty({ example: 'Chất liệu' })
  name: string;

  @ApiProperty({ example: 'Cotton' })
  value: string;
}

class ProductImageDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  colorId: number | null;

  @ApiProperty({ example: 'https://example.com/img.jpg' })
  url: string;

  @ApiPropertyOptional({ example: 'Trắng - mặt trước', nullable: true })
  altText: string | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

class ProductVariantDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  colorId: number;

  @ApiProperty({ example: 1 })
  sizeId: number;

  @ApiProperty({ example: 'BT-W-S' })
  sku: string;

  @ApiProperty({ example: 299000 })
  price: number;

  @ApiPropertyOptional({ example: 249000, nullable: true })
  salePrice: number | null;

  @ApiProperty({ example: 50, description: 'Tồn kho thực tế' })
  onHand: number;

  @ApiProperty({ example: 5, description: 'Số lượng đang giữ cho đơn chưa hoàn tất' })
  reserved: number;

  @ApiProperty({ type: VariantColorDto })
  color: VariantColorDto;

  @ApiProperty({ type: VariantSizeDto })
  size: VariantSizeDto;
}

class ProductVariantAdminDto extends ProductVariantDto {
  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  deletedAt: Date | null;
}

// ─── Public response DTOs ────────────────────────────────────────────────

export class ProductListItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Basic Tee' })
  name: string;

  @ApiProperty({ example: 'ao-basic-tee' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumb.jpg', nullable: true })
  thumbnail: string | null;

  @ApiPropertyOptional({ example: 249000, nullable: true })
  minPrice: number | null;

  @ApiPropertyOptional({ example: 299000, nullable: true })
  maxPrice: number | null;

  @ApiPropertyOptional({ type: CategoryBriefDto, nullable: true })
  category: CategoryBriefDto | null;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 8 })
  totalPages: number;
}

export class ProductListResponseDto {
  @ApiProperty({ type: [ProductListItemResponseDto] })
  data: ProductListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ProductDetailResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Basic Tee' })
  name: string;

  @ApiProperty({ example: 'ao-basic-tee' })
  slug: string;

  @ApiPropertyOptional({ example: 'Áo thun basic...', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ nullable: true })
  thumbnail: string | null;

  @ApiPropertyOptional({ type: CategoryBriefDto, nullable: true })
  category: CategoryBriefDto | null;

  @ApiProperty({ type: [ProductAttributeDto] })
  attributes: ProductAttributeDto[];

  @ApiProperty({ type: [ProductVariantDto] })
  variants: ProductVariantDto[];

  @ApiProperty({ type: [ProductImageDto] })
  images: ProductImageDto[];
}

// ─── Admin response DTOs ─────────────────────────────────────────────────

export class ProductAdminListItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Basic Tee' })
  name: string;

  @ApiProperty({ example: 'ao-basic-tee' })
  slug: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnail: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ type: () => CategoryBriefDto, nullable: true })
  category: CategoryBriefDto | null;

  @ApiProperty({ example: 6 })
  variantCount: number;

  @ApiProperty({ example: 200 })
  totalStock: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  deletedAt: Date | null;
}

export class ProductAdminListResponseDto {
  @ApiProperty({ type: [ProductAdminListItemResponseDto] })
  data: ProductAdminListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ProductAdminDetailResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Basic Tee' })
  name: string;

  @ApiProperty({ example: 'ao-basic-tee' })
  slug: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiPropertyOptional({ nullable: true })
  thumbnail: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ type: CategoryBriefDto, nullable: true })
  category: CategoryBriefDto | null;

  @ApiPropertyOptional({
    example: [3, 12],
    type: [Number],
    description: 'Danh mục đã gán (bảng nối).',
  })
  categoryIds?: number[];

  @ApiProperty({ type: [ProductAttributeDto] })
  attributes: ProductAttributeDto[];

  @ApiProperty({ type: [ProductVariantAdminDto] })
  variants: ProductVariantAdminDto[];

  @ApiProperty({ type: [ProductImageDto] })
  images: ProductImageDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  deletedAt: Date | null;
}
