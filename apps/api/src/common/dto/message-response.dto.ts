import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    example: 'Thao tác thành công',
    description: 'Thông báo kết quả thực hiện',
  })
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
