import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CollectPageVisitDto {
  @ApiProperty({
    example: '/products/abc',
    description: 'Đường dẫn trang (pathname + optional search).',
  })
  @IsString({ message: 'path phải là chuỗi' })
  @MinLength(1, { message: 'path không được rỗng' })
  @MaxLength(500, { message: 'path tối đa 500 ký tự' })
  path!: string;

  @ApiPropertyOptional({ example: 'https://google.com' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'referrer tối đa 500 ký tự' })
  referrer?: string;

  @ApiPropertyOptional({ description: 'Id phiên ẩn danh do client tạo (UUID, localStorage).' })
  @IsOptional()
  @IsString()
  @MaxLength(64, { message: 'sessionKey tối đa 64 ký tự' })
  sessionKey?: string;
}
