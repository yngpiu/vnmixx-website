import { ApiProperty } from '@nestjs/swagger';

export class KnowledgeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'chinh-sach-doi-tra' })
  slug: string;

  @ApiProperty({ example: 'Chính sách đổi trả' })
  title: string;

  @ApiProperty({ example: '<p>Nội dung...</p>' })
  content: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  updatedAt: Date;
}
