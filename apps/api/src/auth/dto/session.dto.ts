import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

/**
 * DTO phản hồi thông tin hồ sơ người dùng hiện tại.
 */
export class ProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'URL ảnh đại diện (nếu có)',
  })
  avatarUrl?: string | null;

  @ApiProperty({ enum: ['CUSTOMER', 'EMPLOYEE'], example: 'CUSTOMER' })
  userType: 'CUSTOMER' | 'EMPLOYEE';

  @ApiProperty({
    example: ['admin'],
    description: 'Danh sách các vai trò (Role) của nhân viên',
  })
  roles: string[];

  @ApiProperty({
    example: ['product.create'],
    description: 'Danh sách các quyền (Permission) của nhân viên',
  })
  permissions: string[];
}
