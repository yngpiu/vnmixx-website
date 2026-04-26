import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * ListAdminReviewsQueryDto: DTO chứa tham số truy vấn danh sách đánh giá cho Admin.
 * Cho phép lọc theo phân trang, trạng thái hiển thị, từ khóa và khách hàng cụ thể.
 */
export class ListAdminReviewsQueryDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1).', example: 1, default: 1 })
  @IsOptional()
  @IsInt({ message: 'page phải là số nguyên.' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số bản ghi mỗi trang (tối đa 50).',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt({ message: 'pageSize phải là số nguyên.' })
  @Min(1, { message: 'pageSize phải lớn hơn hoặc bằng 1.' })
  @Max(50, { message: 'pageSize không được lớn hơn 50.' })
  pageSize?: number = 10;

  @ApiPropertyOptional({
    description: 'Lọc theo hiển thị review.',
    enum: ['all', 'visible', 'hidden'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'visible', 'hidden'], { message: 'visibility phải là all/visible/hidden.' })
  visibility?: 'all' | 'visible' | 'hidden' = 'all';

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tiêu đề/nội dung/sản phẩm/tên khách hàng.',
    example: 'áo khoác',
  })
  @IsOptional()
  @IsString({ message: 'keyword phải là chuỗi.' })
  @MaxLength(100, { message: 'keyword tối đa 100 ký tự.' })
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Lọc review theo khách hàng.',
    example: 21,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'customerId phải là số nguyên.' })
  @Min(1, { message: 'customerId phải lớn hơn hoặc bằng 1.' })
  @IsOptional()
  customerId?: number;
}

/**
 * UpdateReviewVisibilityDto: DTO cập nhật trạng thái hiển thị của đánh giá.
 */
export class UpdateReviewVisibilityDto {
  @ApiProperty({
    description: 'Trạng thái hiển thị review.',
    enum: ['VISIBLE', 'HIDDEN'],
    example: 'VISIBLE',
  })
  @IsString({ message: 'status phải là chuỗi.' })
  @IsIn(['VISIBLE', 'HIDDEN'], { message: 'status phải là VISIBLE hoặc HIDDEN.' })
  status!: 'VISIBLE' | 'HIDDEN';
}

/**
 * AdminReviewListItemDto: DTO hiển thị một dòng thông tin đánh giá trong danh sách quản trị.
 */
export class AdminReviewListItemDto {
  @ApiProperty({ example: 123 })
  id!: number;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiProperty({ nullable: true, example: 'Sản phẩm rất đẹp' })
  title!: string | null;

  @ApiProperty({ nullable: true, example: 'Đóng gói cẩn thận, giao nhanh.' })
  content!: string | null;

  @ApiProperty({ enum: ['VISIBLE', 'HIDDEN'] })
  status!: 'VISIBLE' | 'HIDDEN';

  @ApiProperty({ example: 'Áo sơ mi linen nam' })
  productName!: string;

  @ApiProperty({ nullable: true, example: 'Nguyễn Văn A' })
  customerName!: string | null;

  @ApiProperty({ example: '2026-04-18T12:00:00.000Z' })
  createdAt!: Date;
}

/**
 * AdminReviewsListResponseDto: DTO phản hồi danh sách đánh giá kèm thông tin phân trang cho Admin.
 */
export class AdminReviewsListResponseDto {
  @ApiProperty({ type: [AdminReviewListItemDto] })
  items!: AdminReviewListItemDto[];

  @ApiProperty({ example: 132 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 14 })
  totalPages!: number;
}

/**
 * AdminReviewDetailResponseDto: DTO phản hồi chi tiết đầy đủ một đánh giá cho Admin.
 */
export class AdminReviewDetailResponseDto {
  @ApiProperty({ example: 123 })
  id!: number;

  @ApiProperty({ example: 45 })
  productId!: number;

  @ApiProperty({ nullable: true, example: 12 })
  customerId!: number | null;

  @ApiProperty({ example: 4 })
  rating!: number;

  @ApiProperty({ nullable: true, example: 'Ổn trong tầm giá' })
  title!: string | null;

  @ApiProperty({ nullable: true, example: 'Vải dày, mặc thoải mái.' })
  content!: string | null;

  @ApiProperty({ enum: ['VISIBLE', 'HIDDEN'] })
  status!: 'VISIBLE' | 'HIDDEN';

  @ApiProperty({ example: 'Áo polo basic' })
  productName!: string;

  @ApiProperty({ nullable: true, example: 'Lê Thị B' })
  customerName!: string | null;

  @ApiProperty({ nullable: true, example: 'b@example.com' })
  customerEmail!: string | null;

  @ApiProperty({ example: '2026-04-10T08:12:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-10T08:12:00.000Z' })
  updatedAt!: Date;
}
