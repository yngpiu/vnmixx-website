import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum MediaSortField {
  FILE_NAME = 'fileName',
  CREATED_AT = 'createdAt',
  SIZE = 'size',
}

export enum MediaSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListMediaQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo thư mục' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên file' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo MIME type (prefix match), ví dụ: image, video' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ enum: MediaSortField, default: MediaSortField.CREATED_AT })
  @IsOptional()
  @IsEnum(MediaSortField)
  sortBy?: MediaSortField;

  @ApiPropertyOptional({ enum: MediaSortOrder, default: MediaSortOrder.DESC })
  @IsOptional()
  @IsEnum(MediaSortOrder)
  sortOrder?: MediaSortOrder;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Liệt kê các sub-folder trực tiếp', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeFolders?: boolean;
}
