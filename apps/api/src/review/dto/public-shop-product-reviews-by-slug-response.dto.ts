import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicShopProductReviewsPaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 24 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class PublicShopProductRatingBreakdownDto {
  @ApiProperty({ example: 1, description: 'Số đánh giá 1 sao (hiển thị).' })
  star1: number;

  @ApiProperty({ example: 0 })
  star2: number;

  @ApiProperty({ example: 2 })
  star3: number;

  @ApiProperty({ example: 5 })
  star4: number;

  @ApiProperty({ example: 6 })
  star5: number;
}

export class PublicShopProductReviewItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating: number;

  @ApiPropertyOptional({ example: 'Rất hài lòng', nullable: true })
  title: string | null;

  @ApiPropertyOptional({ example: 'Chất liệu tốt...', nullable: true })
  content: string | null;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: 'Nguyễn V.', description: 'Masked display name for privacy.' })
  authorDisplayName: string;
}

export class PublicShopProductReviewsBySlugResponseDto {
  @ApiProperty({ type: [PublicShopProductReviewItemDto] })
  data: PublicShopProductReviewItemDto[];

  @ApiProperty({ type: PublicShopProductReviewsPaginationMetaDto })
  meta: PublicShopProductReviewsPaginationMetaDto;

  @ApiProperty({ example: 12, description: 'Number of visible reviews for this product.' })
  reviewCount: number;

  @ApiPropertyOptional({
    example: 4.5,
    nullable: true,
    description: 'Average rating (1–5) over visible reviews; null when reviewCount is 0.',
  })
  averageRating: number | null;

  @ApiProperty({
    type: PublicShopProductRatingBreakdownDto,
    description: 'Số lượng đánh giá theo từng mức sao (chỉ review đang hiển thị).',
  })
  ratingBreakdown: PublicShopProductRatingBreakdownDto;
}
