import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * MessagesQueryDto: DTO phân trang danh sách tin nhắn trong cuộc hội thoại.
 * Sử dụng cursor-based pagination dựa trên ID tin nhắn cuối cùng.
 */
export class MessagesQueryDto {
  @ApiPropertyOptional({
    description: 'ID tin nhắn cuối cùng đã tải (cursor). Trả về các tin nhắn cũ hơn cursor này.',
    example: 150,
  })
  @IsOptional()
  @IsInt({ message: 'cursor phải là số nguyên.' })
  @Min(1, { message: 'cursor phải lớn hơn hoặc bằng 1.' })
  cursor?: number;

  @ApiPropertyOptional({
    description: 'Số tin nhắn mỗi lần tải (tối đa 50).',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsInt({ message: 'limit phải là số nguyên.' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1.' })
  @Max(50, { message: 'limit không được lớn hơn 50.' })
  limit?: number = 30;
}
