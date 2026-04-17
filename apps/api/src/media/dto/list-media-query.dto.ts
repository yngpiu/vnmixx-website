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
  @IsString({ message: 'Thư mục phải là chuỗi ký tự' })
  folder?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên file' })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo MIME type (prefix match), ví dụ: image, video' })
  @IsOptional()
  @IsString({ message: 'Loại tệp phải là chuỗi ký tự' })
  mimeType?: string;

  @ApiPropertyOptional({ enum: MediaSortField, default: MediaSortField.CREATED_AT })
  @IsOptional()
  @IsEnum(MediaSortField, { message: 'Trường sắp xếp không hợp lệ' })
  sortBy?: MediaSortField;

  @ApiPropertyOptional({ enum: MediaSortOrder, default: MediaSortOrder.DESC })
  @IsOptional()
  @IsEnum(MediaSortOrder, { message: 'Thứ tự sắp xếp không hợp lệ' })
  sortOrder?: MediaSortOrder;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  page?: number;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Kích thước trang phải là số nguyên' })
  @Min(1, { message: 'Kích thước trang phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Kích thước trang không được vượt quá 100' })
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Liệt kê các sub-folder trực tiếp', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeFolders?: boolean;
}
