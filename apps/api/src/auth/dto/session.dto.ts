import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Shape returned by login / verify OTP / refresh endpoints. */
export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT mã truy cập có thời hạn ngắn (mặc định 15 phút)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Mã làm mới dạng opaque dùng để lấy cặp token mới',
  })
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Thời hạn mã truy cập (giây)' })
  expiresIn: number;

  @ApiProperty({
    enum: ['CUSTOMER', 'EMPLOYEE'],
    example: 'CUSTOMER',
    description: 'Xác định loại người dùng đã được xác thực',
  })
  userType: 'CUSTOMER' | 'EMPLOYEE';
}

/** Type alias kept for internal use where full class is not needed. */
export type AuthResponse = AuthResponseDto;

/** DTO for refreshing an mã truy cập. */
export class RefreshTokenDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Mã làm mới dạng opaque được cấp khi đăng nhập',
  })
  @IsString()
  @IsNotEmpty()
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
