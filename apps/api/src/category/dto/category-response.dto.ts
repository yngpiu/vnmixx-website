import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryParentDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Nam' })
  name: string;

  @ApiProperty({ example: 'nam' })
  slug: string;
}

export class CategoryResponseDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Áo sơ mi' })
  name: string;

  @ApiProperty({ example: 'ao-so-mi' })
  slug: string;

  @ApiProperty({ example: false })
  isFeatured: boolean;

  @ApiProperty({ example: true, description: 'Hiển thị / kinh doanh trên shop' })
  isActive: boolean;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiPropertyOptional({ type: () => CategoryParentDto, nullable: true })
  parent: CategoryParentDto | null;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class CategoryAdminResponseDto extends CategoryResponseDto {
  @ApiPropertyOptional({ example: '2023-01-01T00:00:00.000Z', nullable: true })
  deletedAt: Date | null;
}

export class CategoryTreeNodeDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Nam' })
  name: string;

  @ApiProperty({ example: 'nam' })
  slug: string;

  @ApiProperty({ example: false })
  isFeatured: boolean;

  @ApiProperty({ example: true, description: 'Hiển thị / kinh doanh trên shop' })
  isActive: boolean;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ type: () => [CategoryTreeNodeDto] })
  children: CategoryTreeNodeDto[];
}

/**
 * CategoryDetailDto: Thông tin chi tiết danh mục kèm theo các danh mục con trực tiếp.
 */
export class CategoryDetailDto extends CategoryResponseDto {
  @ApiProperty({ type: () => [CategoryTreeNodeDto], description: 'Danh mục con trực tiếp' })
  children: CategoryTreeNodeDto[];
}
