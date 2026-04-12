import { ApiProperty } from '@nestjs/swagger';

export class SizeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'M' })
  label: string;

  @ApiProperty({ example: 2 })
  sortOrder: number;
}

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
