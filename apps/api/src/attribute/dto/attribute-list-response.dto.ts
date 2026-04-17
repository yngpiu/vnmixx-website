import { ApiProperty } from '@nestjs/swagger';

class AttributeListItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Chất liệu' })
  name: string;

  @ApiProperty({ example: 12 })
  valueCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

class AttributeListMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 45 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class AttributeListResponseDto {
  @ApiProperty({ type: [AttributeListItemDto] })
  data: AttributeListItemDto[];

  @ApiProperty({ type: AttributeListMetaDto })
  meta: AttributeListMetaDto;
}
