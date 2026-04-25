import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * SendMessageDto: DTO xác thực nội dung tin nhắn gửi trong cuộc hội thoại hỗ trợ.
 * Dùng cho cả REST endpoint và WebSocket event.
 */
export class SendMessageDto {
  @ApiProperty({ description: 'Nội dung tin nhắn.', example: 'Tôi cần hỗ trợ về đơn hàng.' })
  @IsString({ message: 'content phải là chuỗi.' })
  @IsNotEmpty({ message: 'content không được để trống.' })
  @MaxLength(2000, { message: 'content tối đa 2000 ký tự.' })
  content!: string;
}
