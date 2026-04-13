import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadMediaDto {
  @ApiPropertyOptional({ description: 'Thư mục đích, ví dụ: banners/slide' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  folder?: string;
}
