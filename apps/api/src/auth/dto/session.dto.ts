import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO phản hồi sau khi đăng nhập hoặc làm mới mã truy cập thành công.
 * Bao gồm accessToken và refreshToken.
 */
export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT mã truy cập có thời hạn ngắn (mặc định 15 phút)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...',
    description: 'Refresh token dạng đục (opaque) dùng để lấy mã truy cập mới',
  })
  refreshToken: string;
}
