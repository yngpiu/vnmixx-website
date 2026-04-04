import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'category.read' })
  name: string;

  @ApiPropertyOptional({ example: 'View categories', nullable: true })
  description: string | null;
}
