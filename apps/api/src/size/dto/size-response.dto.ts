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
