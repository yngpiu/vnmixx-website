import { ApiProperty } from '@nestjs/swagger';

export class AttributeValueResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Cotton' })
  value: string;
}

export class AttributeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Chất liệu' })
  name: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [AttributeValueResponseDto] })
  values: AttributeValueResponseDto[];
}

export class AttributeValueAdminResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  attributeId: number;

  @ApiProperty({ example: 'Cotton' })
  value: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
