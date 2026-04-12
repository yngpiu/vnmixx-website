import { ApiProperty } from '@nestjs/swagger';

export class ColorResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Trắng' })
  name: string;

  @ApiProperty({ example: '#FFFFFF' })
  hexCode: string;
}

export class ColorAdminResponseDto extends ColorResponseDto {
  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

class ColorListPaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class ColorListResponseDto {
  @ApiProperty({ type: [ColorAdminResponseDto] })
  data: ColorAdminResponseDto[];

  @ApiProperty({ type: ColorListPaginationMeta })
  meta: ColorListPaginationMeta;
}
