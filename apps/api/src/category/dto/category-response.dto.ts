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

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiPropertyOptional({ type: () => CategoryParentDto, nullable: true })
  parent: CategoryParentDto | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CategoryAdminResponseDto extends CategoryResponseDto {
  @ApiPropertyOptional({ nullable: true })
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

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ type: () => [CategoryTreeNodeDto] })
  children: CategoryTreeNodeDto[];
}

export class CategoryDetailDto extends CategoryResponseDto {
  @ApiProperty({ type: () => [CategoryTreeNodeDto], description: 'Direct sub-categories' })
  children: CategoryTreeNodeDto[];
}
