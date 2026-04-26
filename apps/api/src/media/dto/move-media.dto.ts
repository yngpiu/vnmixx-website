import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

// DTO định nghĩa cấu trúc dữ liệu để di chuyển một file media sang thư mục khác
export class MoveMediaDto {
  @ApiProperty({ description: 'Thư mục đích', example: 'products/2024/02' })
  @IsString({ message: 'Thư mục đích phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Thư mục đích không được vượt quá 500 ký tự' })
  targetFolder: string;
}
