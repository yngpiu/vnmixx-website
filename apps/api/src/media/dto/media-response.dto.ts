import { ApiProperty } from '@nestjs/swagger';

export class MediaResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'products/2024/01/image.jpg' })
  key: string;

  @ApiProperty({ example: 'image.jpg' })
  fileName: string;

  @ApiProperty({ example: 'products/2024/01' })
  folder: string;

  @ApiProperty({ example: 1, nullable: true })
  folderId?: number | null;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({ example: 1024 })
  size: number;

  @ApiProperty({ example: 800, nullable: true })
  width?: number | null;

  @ApiProperty({ example: 600, nullable: true })
  height?: number | null;

  @ApiProperty({ example: 1, nullable: true })
  uploadedBy?: number | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: 'https://cdn.example.com/products/2024/01/image.jpg' })
  url: string;
}

export class MediaPaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 24 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class MediaListResponseDto {
  @ApiProperty({ type: [MediaResponseDto] })
  data: MediaResponseDto[];

  @ApiProperty({ type: MediaPaginationMetaDto })
  meta: MediaPaginationMetaDto;
}

export class CreateFolderResponseDto {
  @ApiProperty({ example: 'banners/slide' })
  path: string;
}

export class DeleteFolderResponseDto {
  @ApiProperty({ example: 10 })
  deletedFiles: number;

  @ApiProperty({ example: 2 })
  deletedFolders: number;
}
