import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// DTO định nghĩa cấu trúc dữ liệu bổ sung khi upload file media
export class UploadMediaDto {
  @ApiPropertyOptional({ description: 'Thư mục đích, ví dụ: banners/slide', example: 'products' })
  @IsOptional()
  @IsString({ message: 'Thư mục đích phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Thư mục đích không được vượt quá 500 ký tự' })
  folder?: string;
}
