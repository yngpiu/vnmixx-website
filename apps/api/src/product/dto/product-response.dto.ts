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

  @ApiPropertyOptional({ example: 499000, nullable: true })
  compareAtPrice: number | null;

  @ApiProperty({ example: 50, description: 'Tồn kho thực tế' })
  onHand: number;

  @ApiProperty({ example: 5, description: 'Số lượng đang giữ cho đơn chưa hoàn tất' })
  reserved: number;

  @ApiProperty({
    type: VariantColorDto,
    example: { id: 1, name: 'Trắng', hexCode: '#FFFFFF' },
  })
  color: VariantColorDto;

  @ApiProperty({
    type: VariantSizeDto,
    example: { id: 1, label: 'M', sortOrder: 2 },
  })
  size: VariantSizeDto;
}

class ProductVariantAdminDto extends ProductVariantDto {
  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  deletedAt: Date | null;
}

// ─── Public response DTOs ────────────────────────────────────────────────

/** One variant color row on list APIs: URLs belong to this color gallery only. */
export class ProductListColorResponseDto {
  @ApiProperty({ example: 1, description: 'Color id matched to product_variants.color_id.' })
  id: number;

  @ApiProperty({ example: 'Đen' })
  name: string;

  @ApiProperty({ example: '#111111' })
  hexCode: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://example.com/front.jpg',
    description:
      'This color only: lowest sort_order image in product_images for this color_id (front).',
  })
  frontUrl: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://example.com/back.jpg',
    description:
      'This color only: second-lowest sort_order image for this color_id (back); null if fewer than 2 images.',
  })
  backUrl: string | null;
}

export class ProductListVariantResponseDto {
  @ApiProperty({ example: 11 })
  id: number;

  @ApiProperty({ example: 299000 })
  price: number;

  @ApiPropertyOptional({ example: 499000, nullable: true })
  compareAtPrice: number | null;

  @ApiProperty({ example: 24 })
  onHand: number;

  @ApiProperty({ example: 2 })
  reserved: number;

  @ApiProperty({
    type: VariantColorDto,
    example: { id: 1, name: 'Trắng', hexCode: '#FFFFFF' },
  })
  color: VariantColorDto;

  @ApiProperty({
    type: VariantSizeDto,
    example: { id: 2, label: 'M', sortOrder: 2 },
  })
  size: VariantSizeDto;
}

export class ProductListItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Basic Tee' })
  name: string;

  @ApiProperty({ example: 'ao-basic-tee' })
  slug: string;

  @ApiPropertyOptional({ example: 249000, nullable: true })
  minPrice: number | null;

  @ApiPropertyOptional({ example: 299000, nullable: true })
  maxPrice: number | null;

  @ApiPropertyOptional({ type: CategoryBriefDto, nullable: true })
  category: CategoryBriefDto | null;

  @ApiProperty({
    type: [ProductListColorResponseDto],
    description:
      "Distinct variant colors on the listing (max 4, first-appearance order). Each item carries that color's frontUrl/backUrl only; images without color_id are omitted here.",
  })
  colors: ProductListColorResponseDto[];

  @ApiProperty({
    type: [ProductListVariantResponseDto],
    description: 'Public active variants for listing interactions (size picker/add-to-cart).',
  })
  variants: ProductListVariantResponseDto[];
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

  @ApiProperty({ example: 300, description: 'Cân nặng sản phẩm (gram)' })
  weight: number;

  @ApiProperty({ example: 30, description: 'Chiều dài sản phẩm (cm)' })
  length: number;

  @ApiProperty({ example: 25, description: 'Chiều rộng sản phẩm (cm)' })
  width: number;

  @ApiProperty({ example: 5, description: 'Chiều cao sản phẩm (cm)' })
  height: number;

  @ApiPropertyOptional({ type: CategoryBriefDto, nullable: true })
  category: CategoryBriefDto | null;

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

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Preview image URL from product_images (smallest sort_order). No persisted thumbnail column.',
  })
  thumbnail: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ type: () => CategoryBriefDto, nullable: true })
  category: CategoryBriefDto | null;

  @ApiProperty({ example: 6 })
  variantCount: number;

  @ApiProperty({ example: 200 })
  totalStock: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  deletedAt: Date | null;
}

export class ProductAdminListResponseDto {
  @ApiProperty({ type: [ProductAdminListItemResponseDto] })
  data: ProductAdminListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

// ProductAdminDetailResponseDto: Chi tiết sản phẩm đầy đủ dành cho admin.
// Bao gồm toàn bộ thông tin quản trị: SKU, giá nhập, tồn kho chi tiết, trạng thái xóa mềm.
export class ProductAdminDetailResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Basic Tee' })
  name: string;

  @ApiProperty({ example: 'ao-basic-tee' })
  slug: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({ example: 300, description: 'Cân nặng sản phẩm (gram)' })
  weight: number;

  @ApiProperty({ example: 30, description: 'Chiều dài sản phẩm (cm)' })
  length: number;

  @ApiProperty({ example: 25, description: 'Chiều rộng sản phẩm (cm)' })
  width: number;

  @ApiProperty({ example: 5, description: 'Chiều cao sản phẩm (cm)' })
  height: number;

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

  @ApiProperty({ type: [ProductVariantAdminDto] })
  variants: ProductVariantAdminDto[];

  @ApiProperty({ type: [ProductImageDto] })
  images: ProductImageDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  deletedAt: Date | null;
}
