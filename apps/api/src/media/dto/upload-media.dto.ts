import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// DTO định nghĩa cấu trúc dữ liệu bổ sung khi upload file media
export class UploadMediaDto {
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Danh sách file multipart (được xử lý bởi FilesInterceptor).',
  })
  @IsOptional()
  files?: unknown;

  @ApiPropertyOptional({ description: 'Thư mục đích, ví dụ: banners/slide', example: 'products' })
  @IsOptional()
  @IsString({ message: 'Thư mục đích phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Thư mục đích không được vượt quá 500 ký tự' })
  folder?: string;

  @ApiPropertyOptional({
    description: 'ID khách hàng để hệ thống tự map thư mục lưu ảnh thành <customerId>/image',
    example: 123,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID khách hàng phải là số nguyên' })
  @Min(1, { message: 'ID khách hàng phải lớn hơn 0' })
  customerId?: number;
}
