import { ApiProperty } from '@nestjs/swagger';

/** JSON body for login / verify OTP / refresh. Refresh token returned in both body and HttpOnly cookie. */
export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT mã truy cập có thời hạn ngắn (mặc định 15 phút)',
  })
  accessToken: string;

  @ApiProperty({ example: 900, description: 'Thời hạn mã truy cập (giây)' })
  expiresIn: number;

  @ApiProperty({
    example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...',
    description: 'Opaque refresh token (cũng set trong cookie HttpOnly)',
  })
  refreshToken: string;
}

/** Shape returned by profile endpoint. */
export class ProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ enum: ['CUSTOMER', 'EMPLOYEE'], example: 'CUSTOMER' })
  userType: 'CUSTOMER' | 'EMPLOYEE';

  @ApiProperty({
    example: ['admin'],
    description: 'Vai trò của nhân viên (rỗng đối với khách hàng)',
  })
  roles: string[];

  @ApiProperty({
    example: ['product.create'],
    description: 'Quyền của nhân viên (rỗng đối với khách hàng)',
  })
  permissions: string[];
}
