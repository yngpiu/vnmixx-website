import { ApiProperty } from '@nestjs/swagger';

/**
 * SizeResponseDto: DTO phản hồi thông tin kích thước.
 * Vai trò: Định nghĩa cấu trúc dữ liệu kích thước trả về cho client.
 */
export class SizeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'M' })
  label: string;

  @ApiProperty({ example: 2 })
  sortOrder: number;
}

/**
 * SizeAdminResponseDto: DTO phản hồi thông tin kích thước cho Admin.
 */
export class SizeAdminResponseDto extends SizeResponseDto {
  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

class SizeListPaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class SizeListResponseDto {
  @ApiProperty({ type: [SizeAdminResponseDto] })
  data: SizeAdminResponseDto[];

  @ApiProperty({ type: SizeListPaginationMeta })
  meta: SizeListPaginationMeta;
}
